import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
  const assignedRoles = roles.length > 0 ? roles : ['admin'];
  return SetMetadata(ROLES_KEY, assignedRoles);
};

export const IS_AUTHENTICATED_KEY = 'isAuthenticated';
export const Authenticated = () => SetMetadata(IS_AUTHENTICATED_KEY, true);