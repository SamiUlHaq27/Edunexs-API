import { UserRoles } from '../consts';

export type UserRolesType = (typeof UserRoles)[keyof typeof UserRoles];
