import {
  Body,
  Controller,
  Delete,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { InstitutionAdminService } from './services';
import { AllowedRoles } from 'src/shared/reflectors';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import type { UserData } from 'src/shared/types';
import {
  CreateInstitutionAdminDto,
  DeleteInstitutionAdminDto,
  UpdateInstitutionAdminDto,
  UpdateInstitutionAdminProfileDto,
} from './dtos';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('institution-admin')
export class InstitutionAdminController {
  constructor(
    private readonly institutionAdminService: InstitutionAdminService,
  ) {}

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Post()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async create(
    @Body() createInstitutionAdminDto: CreateInstitutionAdminDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.institutionAdminService.create(
      createInstitutionAdminDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Post('all')
  async findAll(
    @Body() listFiltersDto: ListFiltersDto,
    @User() user: UserData,
  ) {
    return await this.institutionAdminService.findAll(user, listFiltersDto);
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Put()
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async update(
    @Body() updateInstitutionAdminDto: UpdateInstitutionAdminDto,
    @User() user: UserData,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.institutionAdminService.update(
      updateInstitutionAdminDto.institutionAdminId,
      updateInstitutionAdminDto,
      user,
      profilePicture,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_OWNER])
  @Delete()
  async delete(
    @Body() deleteInstitutionAdminDto: DeleteInstitutionAdminDto,
    @User() user: UserData,
  ) {
    return await this.institutionAdminService.delete(
      deleteInstitutionAdminDto.institutionAdminId,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.INSTITUTION_ADMIN])
  @Put('profile/me')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async updateProfile(
    @Body() updateInstitutionAdminProfileDto: UpdateInstitutionAdminProfileDto,
    @User('authId') authId: number,
    @UploadedFile() profilePicture?: Express.Multer.File,
  ) {
    return await this.institutionAdminService.updateProfile(
      authId,
      updateInstitutionAdminProfileDto,
      profilePicture,
    );
  }
}
