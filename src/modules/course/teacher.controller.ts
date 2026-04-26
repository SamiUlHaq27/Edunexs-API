import {
  Body,
  Controller,
  Delete,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async createTeacher(
    @Body() createTeacherDto: CreateTeacherDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.teacherService.createTeacher(
      createTeacherDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Post('all')
  async listTeachers(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.listTeachers(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Put()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async updateTeacher(
    @Body() updateTeacherDto: UpdateTeacherDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.teacherService.updateTeacher(
      updateTeacherDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN, UserRoles.INSTITUTION_OWNER])
  @Delete()
  async deleteTeacher(
    @Body() deleteTeacherDto: DeleteTeacherDto,
    @User() user: UserData,
  ) {
    return await this.teacherService.deleteTeacher(deleteTeacherDto, user);
  }
}
