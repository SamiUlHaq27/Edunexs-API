import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssignmentAttachmentEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AuthEntity,
  CustomGradeEntity,
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
import { TeacherGradebookService } from './teacher-gradebook.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      AssignmentAttachmentEntity,
      AssignmentSubmissionEntity,
      GradeEntity,
      CustomGradeEntity,
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
    TeacherGradebookService,
    InstitutionContextService,
    AppwriteStorageService,
  ],
})
export class AssessmentModule {}
