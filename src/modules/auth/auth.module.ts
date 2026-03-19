import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { getSecretValue } from 'src/config/secret.config';
import { InstitutionAdminController } from './institution-admin.controller';
import {
  AuthEntity,
  FileEntity,
  InstitutionEntity,
  OtpEntity,
  ParentLoginEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { AuthService, InstitutionAdminService } from './services';
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
      StudentProfileEntity,
    ]),
    JwtModule.register({
      secret: getSecretValue('JWT_SECRET') || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController, InstitutionAdminController],
  providers: [
    AuthService,
    InstitutionAdminService,
    BrevoService,
    AppwriteStorageService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
