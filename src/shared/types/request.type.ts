import { Request } from 'express';
import { UserRolesType } from './user.type';

export type AppRequest = Request & { user: UserData };

export type UserData = {
  authId: number;
  username: string;
  role: UserRolesType;
  institutionId?: string | null;
  studentProfileId?: number | null;
};
