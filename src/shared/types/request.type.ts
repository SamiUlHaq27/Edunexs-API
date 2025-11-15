import { Request } from 'express';
import { UserRoleEnum } from '../enums';

export type AppRequest = Request & { user: UserData };

export type UserData = {
  authId: number;
  username: string;
  role: UserRoleEnum;
};
