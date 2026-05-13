import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AttendanceEntity,
  AuthEntity,
  CourseEntity,
  InstitutionEntity,
  QuizAttemptEntity,
  QuizEntity,
  SectionEntity,
  SectionOfferingEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { InstitutionContextService } from 'src/shared/services';
import { SectionController } from './section.controller';
import { SectionOfferingController } from './section-offering.controller';
import { SectionOfferingService } from './services/section-offering.service';
import { SectionService } from './services/section.service';

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
      AssignmentEntity,
      AssignmentSubmissionEntity,
      QuizEntity,
      QuizAttemptEntity,
      AttendanceEntity,
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
