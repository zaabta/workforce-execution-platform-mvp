import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permission code(s) required to access an endpoint, e.g.
 * @Permissions('daily_plan.create'). All listed codes are required.
 * Enforced by PermissionsGuard using the AuthorizationService.
 */
export const Permissions = (...codes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, codes);
