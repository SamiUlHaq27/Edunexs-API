import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionAdminController } from './institution-admin.controller';
import { InstitutionAdminService } from './institution-admin.service';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { InstitutionEntity } from 'src/database/entities/institution.entity';
import { OtpEntity } from 'src/database/entities/otp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthEntity, InstitutionEntity, OtpEntity]),
  ],
  controllers: [InstitutionAdminController],
  providers: [InstitutionAdminService],
})
export class InstitutionAdminModule {}
