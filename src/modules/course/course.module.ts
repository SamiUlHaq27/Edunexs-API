import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuthEntity,
  CourseEntity,
  FileEntity,
  InstitutionEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import {
  AppwriteStorageService,
  InstitutionContextService,
} from 'src/shared/services';
import { CourseController } from './course.controller';
import { StudentController } from './student.controller';
import { StudentGroupController } from './student-group.controller';
import { TeacherController } from './teacher.controller';
import {
  CourseService,
  TeacherService,
  StudentService,
  StudentGroupService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEntity,
      AuthEntity,
      InstitutionEntity,
      FileEntity,
      StudentProfileEntity,
      StudentGroupEntity,
    ]),
  ],
  controllers: [
    CourseController,
    TeacherController,
    StudentController,
    StudentGroupController,
  ],
  providers: [
    CourseService,
    TeacherService,
    StudentService,
    StudentGroupService,
    InstitutionContextService,
    AppwriteStorageService,
  ],
  exports: [CourseService],
})
export class CourseModule {}
