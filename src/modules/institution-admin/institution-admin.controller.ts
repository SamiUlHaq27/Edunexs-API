import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { InstitutionAdminService } from './institution-admin.service';
import {
  CreateInstitutionAdminDto,
  UpdateInstitutionAdminDto,
  UpdateInstitutionAdminProfileDto,
  DeleteInstitutionAdminDto,
} from './dtos';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoleEnum } from 'src/shared/enums';
import { User } from 'src/shared/pipes';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';

@Controller('institution-admin')
export class InstitutionAdminController {
  constructor(
    private readonly institutionAdminService: InstitutionAdminService,
  ) {}

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post()
  async create(
    @Body() createInstitutionAdminDto: CreateInstitutionAdminDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.create(
      createInstitutionAdminDto,
      authId,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post('all')
  async findAll(
    @Body() listFiltersDto: ListFiltersDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.findAll(authId, listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Put()
  async update(
    @Body() updateInstitutionAdminDto: UpdateInstitutionAdminDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.update(
      updateInstitutionAdminDto.institutionAdminId,
      updateInstitutionAdminDto,
      authId,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Delete()
  async delete(
    @Body() deleteInstitutionAdminDto: DeleteInstitutionAdminDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.delete(
      deleteInstitutionAdminDto.institutionAdminId,
      authId,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSTITUTION_ADMIN])
  @Put('profile/me')
  async updateProfile(
    @Body() updateInstitutionAdminProfileDto: UpdateInstitutionAdminProfileDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.updateProfile(
      authId,
      updateInstitutionAdminProfileDto,
    );
  }
}
