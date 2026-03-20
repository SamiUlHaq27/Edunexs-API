import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssignmentAttachmentEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AuthEntity,
  FileEntity,
  GradeEntity,
  InstitutionEntity,
  QuizAttemptEntity,
  QuizEntity,
  SectionOfferingEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import {
  AppwriteStorageService,
  InstitutionContextService,
} from 'src/shared/services';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { AssessmentController } from './assessment.controller';
import { AssessmentReportService } from './assessment-report.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      AssignmentAttachmentEntity,
      AssignmentSubmissionEntity,
      GradeEntity,
      SectionOfferingEntity,
      StudentProfileEntity,
      FileEntity,
      AuthEntity,
      QuizEntity,
      QuizAttemptEntity,
      InstitutionEntity,
    ]),
  ],
  controllers: [AssignmentController, QuizController, AssessmentController],
  providers: [
    AssignmentService,
    QuizService,
    AssessmentReportService,
    InstitutionContextService,
    AppwriteStorageService,
  ],
})
export class AssessmentModule {}
