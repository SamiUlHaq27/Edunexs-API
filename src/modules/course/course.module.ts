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
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { TeacherController } from './teacher.controller';
import { StudentController } from './student.controller';
import { TeacherService } from './teacher.service';
import { StudentService } from './student.service';
import { InstitutionContextService } from './institution-context.service';
import { StudentGroupController } from './student-group.controller';
import { StudentGroupService } from './student-group.service';

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
