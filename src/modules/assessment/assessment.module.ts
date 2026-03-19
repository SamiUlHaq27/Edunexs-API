import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssignmentAttachmentEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AuthEntity,
  FileEntity,
  GradeEntity,
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
    ]),
  ],
  controllers: [AssignmentController, QuizController],
  providers: [
    AssignmentService,
    QuizService,
    InstitutionContextService,
    AppwriteStorageService,
  ],
})
export class AssessmentModule {}
