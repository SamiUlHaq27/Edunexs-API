import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto, UpdateInstitutionStatusDto } from './dtos';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoleEnum } from 'src/shared/enums';
import type { AppRequest } from 'src/shared/types';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';

@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Version('1')
  @AllowedRoles([UserRoleEnum.INSITUTION_OWNER])
  @Post()
  async create(
    @Body() createInstitutionDto: CreateInstitutionDto,
    @Req() req: AppRequest,
  ) {
    return this.institutionService.create(
      createInstitutionDto,
      req.user.authId,
    );
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
  @Get(':prefix')
  async findOne(@Param('prefix') prefix: string) {
    return this.institutionService.findOne(prefix);
  }
}
