import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { User } from 'src/shared/pipes';
import { UserRoles } from 'src/shared/consts';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { ListFiltersDto } from 'src/shared/dtos';
import { CreateStudentDto } from './dtos/create-student.dto';
import { DeleteStudentDto } from './dtos/delete-student.dto';
import { UpdateStudentDto } from './dtos/update-student.dto';
import { StudentService } from './services';

@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @User() user: UserData,
  ) {
    return await this.studentService.createStudent(createStudentDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async listStudents(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.studentService.listStudents(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put()
  async updateStudent(
    @Body() updateStudentDto: UpdateStudentDto,
    @User() user: UserData,
  ) {
    return await this.studentService.updateStudent(updateStudentDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async deleteStudent(
    @Body() deleteStudentDto: DeleteStudentDto,
    @User() user: UserData,
  ) {
    return await this.studentService.deleteStudent(deleteStudentDto, user);
  }
}
