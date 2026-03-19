import { Body, Controller, Post, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { ListStudentGradeReportDto } from './dtos';
import { AssessmentReportService } from './assessment-report.service';

@Controller('assessment')
export class AssessmentController {
  constructor(
    private readonly assessmentReportService: AssessmentReportService,
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
}
