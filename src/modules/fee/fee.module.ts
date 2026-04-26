import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthEntity,
  FeeEntity,
  InstitutionEntity,
  ParentStudentEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { InstitutionContextService, StripeService } from 'src/shared/services';
import { FeeController } from './fee.controller';
import { FeeService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuthEntity,
      FeeEntity,
      StudentProfileEntity,
      StudentGroupEntity,
      ParentStudentEntity,
      InstitutionEntity,
    ]),
  ],
  controllers: [FeeController],
  providers: [FeeService, InstitutionContextService, StripeService],
})
export class FeeModule {}
