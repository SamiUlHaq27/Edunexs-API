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
import { InstitutionContextService } from 'src/shared/services';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentGroupController } from './student-group.controller';
import { StudentGroupService } from './student-group.service';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

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
  ],
  exports: [CourseService],
})
export class CourseModule {}
