import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface ScopeCheckInput {
  projectId: string;
  regionId?: string | null;
  locationId?: string | null;
}

export interface UserScopeDto {
  projectId: string;
  regionId: string | null;
  locationId: string | null;
}

/**
 * Domain-layer authorization rules (SDD Section 12.3, 13):
 *  - RBAC determines WHAT a user can do (permissions), resolved per Project
 *    via user_roles -> role_permissions.
 *  - Scope determines WHERE a user can act (Project -> Region -> Location).
 *    Access granted at a higher level (Project or Region) applies to all
 *    subordinate organizational units.
 *
 * Both permissions and scopes are cached in Redis (SDD 6.1) with PostgreSQL
 * as the fallback / authoritative source. Cache entries are namespaced so
 * they can be invalidated independently when roles/scopes change.
 */
@Injectable()
export class AuthorizationService {
  private readonly permTtl: number;
  private readonly masterDataTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.permTtl = Number(
      this.config.get('REDIS_TTL_PERMISSIONS_SECONDS', 900),
    );
    this.masterDataTtl = Number(
      this.config.get('REDIS_TTL_MASTER_DATA_SECONDS', 3600),
    );
  }

  private permKey(userId: string, projectId: string): string {
    return `perm:${userId}:${projectId}`;
  }

  private roleKey(userId: string, projectId: string): string {
    return `role:${userId}:${projectId}`;
  }

  private scopeKey(userId: string): string {
    return `scope:${userId}`;
  }

  /** Effective permission codes for a user within a specific Project. */
  async getEffectivePermissions(
    userId: string,
    projectId: string,
  ): Promise<string[]> {
    const cacheKey = this.permKey(userId, projectId);
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, projectId },
      select: { roleId: true },
    });
    const roleIds = userRoles.map((r) => r.roleId);
    if (roleIds.length === 0) {
      await this.redis.set(cacheKey, [], this.permTtl);
      return [];
    }

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permission: { select: { code: true } } },
    });
    const codes = [...new Set(rolePermissions.map((rp) => rp.permission.code))];

    await this.redis.set(cacheKey, codes, this.permTtl);
    return codes;
  }

  /** Role names a user holds within a specific Project. */
  async getUserRoleNames(userId: string, projectId: string): Promise<string[]> {
    const cacheKey = this.roleKey(userId, projectId);
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) return cached;

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId, projectId },
      select: { role: { select: { name: true } } },
    });
    const names = userRoles.map((r) => r.role.name);
    await this.redis.set(cacheKey, names, this.permTtl);
    return names;
  }

  /** All organizational scopes assigned to a user, across all Projects. */
  async getUserScopes(userId: string): Promise<UserScopeDto[]> {
    const cacheKey = this.scopeKey(userId);
    const cached = await this.redis.get<UserScopeDto[]>(cacheKey);
    if (cached) return cached;

    const scopes = await this.prisma.userScope.findMany({
      where: { userId },
      select: { projectId: true, regionId: true, locationId: true },
    });
    await this.redis.set(cacheKey, scopes, this.masterDataTtl);
    return scopes;
  }

  /** True if the user holds ALL of the given permission codes within the Project. */
  async hasPermission(
    userId: string,
    projectId: string,
    required: string[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const granted = await this.getEffectivePermissions(userId, projectId);
    return required.every((code) => granted.includes(code));
  }

  /**
   * True if the user has a scope covering the given Project/Region/Location.
   * A scope granted at Project level (region/location null) covers every
   * Region and Location within that Project. A scope granted at Region level
   * (location null) covers every Location within that Region.
   */
  async hasScope(userId: string, target: ScopeCheckInput): Promise<boolean> {
    const scopes = await this.getUserScopes(userId);
    return scopes.some((s) => {
      if (s.projectId !== target.projectId) return false;
      if (s.regionId && s.regionId !== target.regionId) return false;
      if (s.locationId && s.locationId !== target.locationId) return false;
      return true;
    });
  }

  /** Invalidate cached permissions/roles for a user (call after role changes). */
  async invalidateUserAuthCache(
    userId: string,
    projectId?: string,
  ): Promise<void> {
    if (projectId) {
      await this.redis.del(
        this.permKey(userId, projectId),
        this.roleKey(userId, projectId),
      );
    } else {
      await this.redis.delByPattern(`perm:${userId}:*`);
      await this.redis.delByPattern(`role:${userId}:*`);
    }
  }

  /** Invalidate cached scopes for a user (call after scope changes). */
  async invalidateUserScopeCache(userId: string): Promise<void> {
    await this.redis.del(this.scopeKey(userId));
  }

  /**
   * Throws ForbiddenException if the user does not have the given scope.
   * Use this in service-layer checks after the resource has been loaded.
   */
  async assertScope(
    userId: string,
    target: ScopeCheckInput,
  ): Promise<void> {
    const allowed = await this.hasScope(userId, target);
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this Project/Region/Location scope.',
      );
    }
  }

  /**
   * Throws ForbiddenException if the user does not hold the required permission
   * within the given Project. Use this in service-layer checks.
   */
  async assertPermission(
    userId: string,
    projectId: string,
    permission: string,
  ): Promise<void> {
    const allowed = await this.hasPermission(userId, projectId, [permission]);
    if (!allowed) {
      throw new ForbiddenException(
        `You do not have permission to perform this action. Required: ${permission}.`,
      );
    }
  }
}
