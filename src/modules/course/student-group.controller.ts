import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { CreateStudentGroupDto } from './dtos/create-student-group.dto';
import { DeleteStudentGroupDto } from './dtos/delete-student-group.dto';
import { UpdateStudentGroupDto } from './dtos/update-student-group.dto';
import { StudentGroupService } from './student-group.service';

@Controller('student/group')
export class StudentGroupController {
  constructor(private readonly studentGroupService: StudentGroupService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createStudentGroup(
    @Body() createStudentGroupDto: CreateStudentGroupDto,
    @User() user: UserData,
  ) {
    return await this.studentGroupService.createStudentGroup(
      createStudentGroupDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async listStudentGroups(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.studentGroupService.listStudentGroups(
      listFiltersDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put()
  async updateStudentGroup(
    @Body() updateStudentGroupDto: UpdateStudentGroupDto,
    @User() user: UserData,
  ) {
    return await this.studentGroupService.updateStudentGroup(
      updateStudentGroupDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async deleteStudentGroup(
    @Body() deleteStudentGroupDto: DeleteStudentGroupDto,
    @User() user: UserData,
  ) {
    return await this.studentGroupService.deleteStudentGroup(
      deleteStudentGroupDto,
      user,
    );
  }
}
