import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import { CreateSectionDto, DeleteSectionDto, UpdateSectionDto } from './dtos';
import { SectionService } from './services';

@Controller('section')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createSection(
    @Body() createSectionDto: CreateSectionDto,
    @User() user: UserData,
  ) {
    return await this.sectionService.createSection(createSectionDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async listSections(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.sectionService.listSections(listFiltersDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put()
  async updateSection(
    @Body() updateSectionDto: UpdateSectionDto,
    @User() user: UserData,
  ) {
    return await this.sectionService.updateSection(updateSectionDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async deleteSection(
    @Body() deleteSectionDto: DeleteSectionDto,
    @User() user: UserData,
  ) {
    return await this.sectionService.deleteSection(deleteSectionDto, user);
  }
}
