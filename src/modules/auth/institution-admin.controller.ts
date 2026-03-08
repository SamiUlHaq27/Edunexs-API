import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { InstitutionAdminService } from './institution-admin.service';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import {
  CreateInstitutionAdminDto,
  DeleteInstitutionAdminDto,
  UpdateInstitutionAdminDto,
  UpdateInstitutionAdminProfileDto,
} from './dtos';

@Controller('institution-admin')
export class InstitutionAdminController {
  constructor(
    private readonly institutionAdminService: InstitutionAdminService,
  ) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
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
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Post('all')
  async findAll(
    @Body() listFiltersDto: ListFiltersDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionAdminService.findAll(authId, listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
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
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
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
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
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
