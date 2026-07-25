import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthorizationService } from '../../authorization/authorization.service';

/**
 * Enforces the Project -> Region -> Location scope hierarchy (SDD 13).
 *
 * Like PermissionsGuard, this guard can only validate scope here when the
 * Project/Region/Location are directly present on the incoming request. For
 * id-addressed resources, the equivalent hasScope() check is performed by the
 * domain service once the resource (and therefore its scope) is loaded.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
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

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const source = { ...request.query, ...request.params, ...request.body };
    const projectId = source.projectId;
    if (!projectId) {
      // Deferred to service-layer check.
      return true;
    }

    const allowed = await this.authorization.hasScope(user.userId, {
      projectId,
      regionId: source.regionId ?? null,
      locationId: source.locationId ?? null,
    });

    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this Project/Region/Location scope.',
      );
    }
    return true;
  }
}
