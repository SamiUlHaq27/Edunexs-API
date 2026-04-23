import { Body, Controller, Post, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateCustomGradeDto,
  CreateCustomGradesDto,
  ListStudentGradeReportDto,
  TeacherGradebookDto,
  TeacherStudentGradesDto,
  UpdateTeacherGradeDto,
} from './dtos';
import { AssessmentReportService } from './assessment-report.service';
import { TeacherGradebookService } from './teacher-gradebook.service';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly assessmentReportService: AssessmentReportService,
    private readonly teacherGradebookService: TeacherGradebookService,
  ) {}

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT, UserRoles.PARENT])
  @Post('report')
  async getStudentGradeReport(
    @Body() listDto: ListStudentGradeReportDto,
    @User() user: UserData,
  ) {
    return this.assessmentReportService.getStudentGradeReport(listDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/gradebook')
  async getTeacherGradebook(
    @Body() dto: TeacherGradebookDto,
    @User() user: UserData,
  ) {
    return this.teacherGradebookService.getTeacherGradebook(dto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/student-grades')
  async getTeacherStudentGrades(
    @Body() dto: TeacherStudentGradesDto,
    @User() user: UserData,
  ) {
    return this.teacherGradebookService.getTeacherStudentGrades(dto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/custom-grade')
  async upsertCustomGrade(
    @Body() dto: CreateCustomGradeDto,
    @User() user: UserData,
  ) {
    return this.teacherGradebookService.upsertCustomGrade(dto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/custom-grades')
  async createCustomGrades(
    @Body() dto: CreateCustomGradesDto,
    @User() user: UserData,
  ) {
    return this.teacherGradebookService.createCustomGrades(dto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/grade/update')
  async updateTeacherGrade(
    @Body() dto: UpdateTeacherGradeDto,
    @User() user: UserData,
  ) {
    return this.teacherGradebookService.updateTeacherGrade(dto, user);
  }
}
