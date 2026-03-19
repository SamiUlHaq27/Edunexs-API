import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { CourseService } from './services';
import { CreateCourseDto, DeleteCourseDto, UpdateCourseDto } from './dtos';
import { ListFiltersDto } from 'src/shared/dtos';
import type { UserData } from 'src/shared/types';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @User() user: UserData,
  ) {
    return await this.courseService.create(createCourseDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async list(@Body() getCourses: ListFiltersDto, @User() user: UserData) {
    return await this.courseService.list(getCourses, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Put()
  async update(
    @Body() updateCourseDto: UpdateCourseDto,
    @User() user: UserData,
  ) {
    return await this.courseService.update(updateCourseDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async delete(
    @Body() deleteCourseDto: DeleteCourseDto,
    @User() user: UserData,
  ) {
    return await this.courseService.delete(deleteCourseDto, user);
  }
}
