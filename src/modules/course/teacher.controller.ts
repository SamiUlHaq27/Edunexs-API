import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { User } from 'src/shared/pipes';
import { UserRoles } from 'src/shared/consts';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { ListFiltersDto } from 'src/shared/dtos';
import { CreateTeacherDto, DeleteTeacherDto, UpdateTeacherDto } from './dtos';
import { TeacherService } from './services';

@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createTeacher(
    @Body() createTeacherDto: CreateTeacherDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.createTeacher(createTeacherDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async listTeachers(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.listTeachers(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put()
  async updateTeacher(
    @Body() updateTeacherDto: UpdateTeacherDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.updateTeacher(updateTeacherDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async deleteTeacher(
    @Body() deleteTeacherDto: DeleteTeacherDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.deleteTeacher(deleteTeacherDto, user);
  }
}
