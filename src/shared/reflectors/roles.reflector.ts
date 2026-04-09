import { Reflector } from '@nestjs/core';
import { UserRolesType } from '../types/user.type';

export const AllowedRoles = Reflector.createDecorator<UserRolesType[]>();
