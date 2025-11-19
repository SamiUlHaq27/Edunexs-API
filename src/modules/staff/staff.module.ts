import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { AuthEntity } from 'src/database/entities/auth.entity';
import { InstitutionEntity } from 'src/database/entities/institution.entity';
import { OtpEntity } from 'src/database/entities/otp.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthEntity, InstitutionEntity, OtpEntity]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
