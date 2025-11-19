import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { OtpEntity } from 'src/database/entities/otp.entity';
import { getSecretValue } from 'src/config/secret.config';
import { BrevoService } from 'src/shared/services/brevo.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuthEntity, OtpEntity]),
    JwtModule.register({
      secret: getSecretValue('JWT_SECRET') || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BrevoService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
