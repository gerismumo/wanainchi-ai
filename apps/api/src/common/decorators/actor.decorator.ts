import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../enums/roles.enums';

export interface ActorContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  canSellBelowNetPrice: boolean;
  ip?: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  isSuperAdmin: boolean;
  userAgent?: string | null;
  /**
   * User ids this actor is explicitly forbidden from viewing, even though
   * they may otherwise be a moderator/admin who can see "all users".
   * Populated once per request by RestrictionsInterceptor — empty for
   * non-moderators (they're already locked to their own id anyway).
   */
  restrictedUserIds: string[];
}

function hasRole(roles: string[], allowed: UserRole[]): boolean {
  return allowed.some((r) => roles.includes(r));
}

export const Actor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActorContext => {
    const req = ctx.switchToHttp().getRequest();

    const roles = req.user?.roles ?? [];

    const isSuperAdmin = hasRole(roles, [UserRole.SuperAdmin]);
    const isAdmin = hasRole(roles, [UserRole.SuperAdmin, UserRole.Admin]);
    const isModerator = hasRole(roles, [
      UserRole.SuperAdmin,
      UserRole.Admin,
      UserRole.Moderator,
    ]);

    return {
      id: req.user?.id ?? null,
      email: req.user?.email ?? null,
      firstName: req.user?.firstName ?? null,
      lastName: req.user?.lastName ?? null,
      roles: roles,
      canSellBelowNetPrice: req.user.canSellBelowNetPrice ?? null,
      ip: req.clientIp ?? null,
      isAdmin,
      isModerator,
      isSuperAdmin,
      userAgent: req.headers?.['user-agent'] ?? null,
      // Attached by RestrictionsInterceptor earlier in the pipeline.
      // Falls back to [] so callers never need a null check.
      restrictedUserIds: req.user?.restrictedUserIds ?? [],
    };
  },
);