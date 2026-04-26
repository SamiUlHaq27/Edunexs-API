import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { InstitutionAdminController } from './institution-admin.controller';
import { ParentController } from './parent.controller';
import { getSecretValue } from 'src/config/secret.config';
import {
  AuthEntity,
  FileEntity,
  InstitutionEntity,
  OtpEntity,
  ParentLoginEntity,
  ParentStudentEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { AuthService, InstitutionAdminService } from './services';
import { ParentService } from './services/parent.service';
import { BrevoService, AppwriteStorageService } from 'src/shared/services';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthEntity,
      OtpEntity,
      FileEntity,
      InstitutionEntity,
      ParentLoginEntity,
      ParentStudentEntity,
      StudentProfileEntity,
    ]),
    JwtModule.register({
      secret: getSecretValue('JWT_SECRET') || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController, InstitutionAdminController, ParentController],
  providers: [
    AuthService,
    InstitutionAdminService,
    ParentService,
    BrevoService,
    AppwriteStorageService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
