import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthEntity,
  FeeEntity,
  InstitutionEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { InstitutionContextService } from 'src/shared/services';
import { FeeController } from './fee.controller';
import { FeeService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthEntity,
      FeeEntity,
      StudentProfileEntity,
      StudentGroupEntity,
      InstitutionEntity,
    ]),
  ],
  controllers: [FeeController],
  providers: [FeeService, InstitutionContextService],
})
export class FeeModule {}
