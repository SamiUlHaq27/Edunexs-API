import { Body, Controller, Get, Post, Put, Version } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
  UpdateInstitutionStatusDto,
} from './dtos';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoleEnum } from 'src/shared/enums';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';

@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post()
  async create(
    @Body() createInstitutionDto: CreateInstitutionDto,
    @User('authId') authId: number,
  ) {
    return this.institutionService.create(createInstitutionDto, authId);
  }

  @Version('1')
  @Get()
  async findAll() {
    return this.institutionService.findAll();
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.ADMIN])
  @Post('admin/all')
  async findAllForAdmin(@Body() listFiltersDto: ListFiltersDto) {
    return this.institutionService.findAllForAdmin(listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.ADMIN])
  @Post('admin/status')
  async updateStatus(@Body() updateStatusDto: UpdateInstitutionStatusDto) {
    return this.institutionService.updateStatus(updateStatusDto);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Get('my-institution')
  async getMyInstitution(@User('authId') authId: number) {
    return await this.institutionService.findByOwnerId(authId);
  }

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Put()
  async update(
    @Body() updateInstitutionDto: UpdateInstitutionDto,
    @User('authId') authId: number,
  ) {
    return await this.institutionService.update(authId, updateInstitutionDto);
  }
}
