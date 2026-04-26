import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Version,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InstitutionService } from './institution.service';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
  UpdateInstitutionStatusDto,
} from './dtos';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import type { UserData } from 'src/shared/types';

@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Post()
  async create(
    @Body() createInstitutionDto: CreateInstitutionDto,
    @User() user: UserData,
  ) {
    return this.institutionService.create(createInstitutionDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.ADMIN])
  @Post('admin/all')
  async findAllForAdmin(@Body() listFiltersDto: ListFiltersDto) {
    return this.institutionService.findAllForAdmin(listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoles.ADMIN])
  @Post('admin/status')
  async updateStatus(@Body() updateStatusDto: UpdateInstitutionStatusDto) {
    return this.institutionService.updateStatus(updateStatusDto);
  }

  @Version('1')
  @AllowedRoles([
    UserRoles.INSTITUTION_OWNER,
    UserRoles.INSTITUTION_ADMIN,
    UserRoles.TEACHER,
    UserRoles.STUDENT,
    UserRoles.PARENT,
  ])
  @Get('my-institution')
  async getMyInstitution(@User() user: UserData) {
    return await this.institutionService.findMyInstitution(user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Put()
  async update(
    @Body() updateInstitutionDto: UpdateInstitutionDto,
    @User() user: UserData,
  ) {
    return await this.institutionService.update(user, updateInstitutionDto);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Post('upload-logo')
  @UseInterceptors(
    FileInterceptor('logoFile', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadLogo(
    @UploadedFile() logoFile: Express.Multer.File,
    @User() user: UserData,
  ) {
    if (!logoFile) {
      throw new BadRequestException('No file provided');
    }

    return this.institutionService.uploadLogo(user, logoFile);
  }
}
