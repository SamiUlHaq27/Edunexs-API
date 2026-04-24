import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Version,
} from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateParentDto,
  UpdateParentDto,
  AddStudentsDto,
  RemoveStudentsDto,
  CreateParentLoginDto,
  ResetParentPasswordDto,
} from './dtos';
import { ParentService } from './services';

@Controller('parent')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  /**
   * NEW: Create a parent and link them to students
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createParent(
    @Body() createParentDto: CreateParentDto,
    @User() user: UserData,
  ) {
    return await this.parentService.createParent(createParentDto, user);
  }

  /**
   * NEW: List all parents in the institution
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Get('all')
  async listParents(
    @User() user: UserData,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return await this.parentService.listParents(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  /**
   * NEW: Update parent details (name, enabled status)
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Put(':id')
  async updateParent(
    @Param('id') parentId: string,
    @Body() updateParentDto: UpdateParentDto,
    @User() user: UserData,
  ) {
    return await this.parentService.updateParent(
      parseInt(parentId, 10),
      updateParentDto,
      user,
    );
  }

  /**
   * NEW: Delete a parent
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Delete(':id')
  async deleteParent(@Param('id') parentId: string, @User() user: UserData) {
    return await this.parentService.deleteParent(parseInt(parentId, 10), user);
  }

  /**
   * NEW: Add students to a parent
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post(':id/students/add')
  async addStudents(
    @Param('id') parentId: string,
    @Body() addStudentsDto: AddStudentsDto,
    @User() user: UserData,
  ) {
    return await this.parentService.addStudents(
      parseInt(parentId, 10),
      addStudentsDto,
      user,
    );
  }

  /**
   * NEW: Remove students from a parent
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Post(':id/students/remove')
  async removeStudents(
    @Param('id') parentId: string,
    @Body() removeStudentsDto: RemoveStudentsDto,
    @User() user: UserData,
  ) {
    return await this.parentService.removeStudents(
      parseInt(parentId, 10),
      removeStudentsDto,
      user,
    );
  }

  /**
   * NEW: Get students linked to a parent
   */
  @Version('1')
  @AllowedRoles([UserRoles.PARENT])
  @Get('me/students')
  async getMyLinkedStudents(@User() user: UserData) {
    return await this.parentService.getMyLinkedStudents(user);
  }

  /**
   * NEW: Get students linked to a parent
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER, UserRoles.INSTITUTION_ADMIN])
  @Get(':id/students')
  async getLinkedStudents(
    @Param('id') parentId: string,
    @User() user: UserData,
  ) {
    return await this.parentService.getLinkedStudents(
      parseInt(parentId, 10),
      user,
    );
  }

  /**
   * DEPRECATED: Legacy parent login creation (one parent to one student)
   * Use createParent() for new functionality
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('legacy/create')
  async createParentLogin(
    @Body() createParentLoginDto: CreateParentLoginDto,
    @User() user: UserData,
  ) {
    return await this.parentService.createParentLogin(
      createParentLoginDto,
      user,
    );
  }

  /**
   * DEPRECATED: Legacy password reset
   * Use updateParent() for name/status updates or implement parent password reset flow
   */
  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put('legacy/reset-password')
  async resetParentPassword(
    @Body() resetParentPasswordDto: ResetParentPasswordDto,
    @User() user: UserData,
  ) {
    return await this.parentService.resetParentPassword(
      resetParentPasswordDto,
      user,
    );
  }
}
