import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthEntity,
  CourseEntity,
  InstitutionEntity,
  SectionEntity,
  SectionOfferingEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { InstitutionContextService } from 'src/shared/services';
import { SectionController } from './section.controller';
import { SectionOfferingController } from './section-offering.controller';
import { SectionOfferingService } from './section-offering.service';
import { SectionService } from './section.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SectionEntity,
      SectionOfferingEntity,
      CourseEntity,
      AuthEntity,
      InstitutionEntity,
      StudentProfileEntity,
      StudentGroupEntity,
    ]),
  ],
  controllers: [SectionController, SectionOfferingController],
  providers: [
    SectionService,
    SectionOfferingService,
    InstitutionContextService,
  ],
})
export class SectionModule {}
