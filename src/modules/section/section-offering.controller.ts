import { Body, Controller, Delete, Post, Put, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateSectionOfferingDto,
  DeleteSectionOfferingDto,
  UpdateSectionOfferingDto,
} from './dtos';
import { SectionOfferingService } from './section-offering.service';

@Controller('section/offering')
export class SectionOfferingController {
  constructor(
    private readonly sectionOfferingService: SectionOfferingService,
  ) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post()
  async createSectionOffering(
    @Body() createSectionOfferingDto: CreateSectionOfferingDto,
    @User() user: UserData,
  ) {
    return await this.sectionOfferingService.createSectionOffering(
      createSectionOfferingDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Post('all')
  async listSectionOfferings(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.sectionOfferingService.listSectionOfferings(
      listFiltersDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put()
  async updateSectionOffering(
    @Body() updateSectionOfferingDto: UpdateSectionOfferingDto,
    @User() user: UserData,
  ) {
    return await this.sectionOfferingService.updateSectionOffering(
      updateSectionOfferingDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Delete()
  async deleteSectionOffering(
    @Body() deleteSectionOfferingDto: DeleteSectionOfferingDto,
    @User() user: UserData,
  ) {
    return await this.sectionOfferingService.deleteSectionOffering(
      deleteSectionOfferingDto,
      user,
    );
  }
}
