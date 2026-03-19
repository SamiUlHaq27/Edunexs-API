import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AssignmentAttachmentEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AuthEntity,
  FileEntity,
  GradeEntity,
  SectionOfferingEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import {
  AppwriteStorageService,
  InstitutionContextService,
} from 'src/shared/services';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

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
    ]),
  ],
  controllers: [AssignmentController],
  providers: [
    AssignmentService,
    InstitutionContextService,
    AppwriteStorageService,
  ],
})
export class AssessmentModule {}
