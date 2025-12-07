import { AuthModule } from './auth/auth.module';
import { InstitutionModule } from './institution/institution.module';
import { InstitutionAdminModule } from './institution-admin/institution-admin.module';

export const AllModules = [
  AuthModule,
  InstitutionModule,
  InstitutionAdminModule,
];
