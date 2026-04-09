import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateAssignmentDto,
  GradeAssignmentDto,
  ListAssignmentSubmissionsDto,
  ListStudentAssignmentsDto,
  ListTeacherAssignmentsDto,
  SubmitAssignmentDto,
} from './dtos';
import { AssignmentService } from './assignment.service';

@Controller('assignment')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/create')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async createAssignment(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @User() user: UserData,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return await this.assignmentService.createAssignment(
      createAssignmentDto,
      user,
      files || [],
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/all')
  async listTeacherAssignments(
    @Body() listTeacherAssignmentsDto: ListTeacherAssignmentsDto,
    @User() user: UserData,
  ) {
    return await this.assignmentService.listTeacherAssignments(
      listTeacherAssignmentsDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/submissions')
  async listAssignmentSubmissions(
    @Body() listAssignmentSubmissionsDto: ListAssignmentSubmissionsDto,
    @User() user: UserData,
  ) {
    return await this.assignmentService.listAssignmentSubmissions(
      listAssignmentSubmissionsDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/grade')
  async gradeAssignment(
    @Body() gradeAssignmentDto: GradeAssignmentDto,
    @User() user: UserData,
  ) {
    return await this.assignmentService.gradeAssignment(
      gradeAssignmentDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT])
  @Post('student/all')
  async listStudentAssignments(
    @Body() listStudentAssignmentsDto: ListStudentAssignmentsDto,
    @User() user: UserData,
  ) {
    return await this.assignmentService.listStudentAssignments(
      listStudentAssignmentsDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT])
  @Post('student/submit')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async submitAssignment(
    @Body() submitAssignmentDto: SubmitAssignmentDto,
    @User() user: UserData,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return await this.assignmentService.submitAssignment(
      submitAssignmentDto,
      user,
      file,
    );
  }
}
