import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthorizationService } from '../../authorization/authorization.service';

/**
 * Enforces the permission code(s) declared via @Permissions(...) (SDD 12.3).
 *
 * Permissions in this platform are resolved per-Project (user_roles.project_id),
 * so this guard needs a projectId to evaluate against. For endpoints where the
 * Project is directly addressable from the incoming request (route param,
 * body, or query — e.g. creating a Daily Plan), the guard performs the full
 * check here.
 *
 * For endpoints addressed by resource id only (e.g. POST /daily-plans/:id/approve),
 * the Project cannot be known until the resource is loaded, so this guard lets
 * the request through and the responsible domain service (e.g. WorkflowService)
 * performs the equivalent hasPermission() + hasScope() check after loading the
 * resource, exactly as required by SDD 10.5: "The backend evaluates the current
 * workflow stage and verifies whether the requesting user has the required
 * role, permission, and organizational scope."
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const projectId =
      request.params?.projectId ||
      request.body?.projectId ||
      request.query?.projectId;
    if (!projectId) {
      // Deferred to service-layer check (resource must be loaded first).
      return true;
    }

    const allowed = await this.authorization.hasPermission(
      user.userId,
      projectId,
      required,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
