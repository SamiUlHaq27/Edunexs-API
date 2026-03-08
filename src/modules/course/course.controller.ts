import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { CourseService } from './course.service';
import { CreateCourseDto, DeleteCourseDto, UpdateCourseDto } from './dtos';
import { ListFiltersDto } from 'src/shared/dtos';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @User('authId') authId: number,
  ) {
    return await this.courseService.create(createCourseDto, authId);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async list(
    @Body() getCourses: ListFiltersDto,
    @User('authId') authId: number,
  ) {
    return await this.courseService.list(getCourses, authId);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Put()
  async update(
    @Body() updateCourseDto: UpdateCourseDto,
    @User('authId') authId: number,
  ) {
    return await this.courseService.update(updateCourseDto, authId);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async delete(
    @Body() deleteCourseDto: DeleteCourseDto,
    @User('authId') authId: number,
  ) {
    return await this.courseService.delete(deleteCourseDto, authId);
  }
}
