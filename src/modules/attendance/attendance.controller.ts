import { Body, Controller, Post, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  ListStudentAttendanceDto,
  ListTeacherAttendanceDto,
  MarkAttendanceDto,
  TeacherAttendanceReportDto,
} from './dtos';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/mark')
  async markAttendance(
    @Body() markAttendanceDto: MarkAttendanceDto,
    @User() user: UserData,
  ) {
    return await this.attendanceService.markAttendance(markAttendanceDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/all')
  async listTeacherAttendance(
    @Body() listTeacherAttendanceDto: ListTeacherAttendanceDto,
    @User() user: UserData,
  ) {
    return await this.attendanceService.listTeacherAttendance(
      listTeacherAttendanceDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/report')
  async getTeacherAttendanceReport(
    @Body() teacherAttendanceReportDto: TeacherAttendanceReportDto,
    @User() user: UserData,
  ) {
    return await this.attendanceService.getTeacherAttendanceReport(
      teacherAttendanceReportDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT])
  @Post('student/all')
  async listStudentAttendance(
    @Body() listStudentAttendanceDto: ListStudentAttendanceDto,
    @User() user: UserData,
  ) {
    return await this.attendanceService.listStudentAttendance(
      listStudentAttendanceDto,
      user,
    );
  }
}
