import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import {
  InstitutionEntity,
  FileEntity,
  AuthEntity,
} from 'src/database/entities';
import {
  CreateInstitutionDto,
  UpdateInstitutionDto,
  UpdateInstitutionStatusDto,
} from './dtos';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { BrevoService } from 'src/shared/services/brevo.service';
import { AppwriteStorageService } from 'src/shared/services/appwrite-storage.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';
import type { UserData } from 'src/shared/types/request.type';

@Injectable()
export class InstitutionService {
  private logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    private readonly brevoService: BrevoService,
    private readonly appwriteStorageService: AppwriteStorageService,
  ) {}

  async create(createInstitutionDto: CreateInstitutionDto, user: UserData) {
    const { prefix, name, city, country, address } = createInstitutionDto;

    // Check if owner already has an institution
    const ownerInstitution = await this.findInstitutionForOwner(user);

    if (ownerInstitution) {
      throw new ForbiddenException(
        'You have already created an institution. Each owner can only create one institution.',
      );
    }

    // Check if institution with this prefix already exists
    const existingInstitution = await this.institutionRepository.findOne({
      where: { prefix },
    });

    if (existingInstitution) {
      throw new ConflictException(
        'Institution with this prefix already exists',
      );
    }

    // Create new institution
    const newInstitution = this.institutionRepository.create({
      prefix,
      name,
      city,
      country,
      address,
      owner: { id: user.authId },
    });

    try {
      const savedInstitution =
        await this.institutionRepository.save(newInstitution);

      // Link the institution back to the owner's auth record
      // This ensures user.institution is populated when they log in
      await this.authRepository.update(
        { id: user.authId },
        { institution: savedInstitution },
      );

      return {
        prefix: savedInstitution?.prefix,
        name: savedInstitution?.name,
        city: savedInstitution?.city,
        country: savedInstitution?.country,
        address: savedInstitution?.address,
        createdAt: savedInstitution?.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create institution');
    }
  }

  async findAllForAdmin(listFiltersDto: ListFiltersDto) {
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    // Define allowed institution attributes for filtering
    const allowedAttributes = ['prefix', 'name', 'city', 'country', 'address'];

    // Build where clause based on filters
    const where: FindOptionsWhere<InstitutionEntity> = {};

    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          const k = key as keyof InstitutionEntity;

          // Handle createdAt with Between operator for date range
          if (k === 'createdAt' && typeof value === 'object') {
            const dateFilter = value as { start?: string; end?: string };
            if (dateFilter.start && dateFilter.end) {
              where[k] = Between(
                new Date(dateFilter.start),
                new Date(dateFilter.end),
              );
            } else if (dateFilter.start) {
              where[k] = Between(new Date(dateFilter.start), new Date());
            } else if (dateFilter.end) {
              where[k] = Between(new Date(0), new Date(dateFilter.end));
            }
          } else if (allowedAttributes.includes(key)) {
            // Narrow and coerce types to avoid unsafe `any` assignment
            where[k as keyof typeof allowedAttributes] = String(value);
          }
        }
      }
    }

    const [data, total] = await this.institutionRepository.findAndCount({
      where,
      relations: ['owner', 'logoFile'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    // Map data to include logo file public URL
    const mappedData = data.map((institution) => {
      const logo = institution.logoFile
        ? {
            id: institution.logoFile.id,
            fileId: institution.logoFile.fileId,
            publicUrl: this.appwriteStorageService.getFileViewUrl({
              fileId: institution.logoFile.fileId,
            }),
          }
        : null;

      return {
        ...institution,
        logo,
      };
    });

    return {
      data: mappedData,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async findByOwner(user: UserData) {
    const institution = await this.findInstitutionForOwner(user, [
      'owner',
      'logoFile',
    ]);

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    // Format response with logo file data if available
    const logoFile = institution.logoFile
      ? {
          dbFileId: institution.logoFile.id,
          appwriteFileId: institution.logoFile.fileId,
          fileName: institution.logoFile.fileName,
          mimeType: institution.logoFile.mimeType,
          sizeOriginal: institution.logoFile.sizeOriginal,
          publicUrl: this.appwriteStorageService.getFileViewUrl({
            fileId: institution.logoFile.fileId,
          }),
        }
      : null;

    return {
      prefix: institution.prefix,
      name: institution.name,
      city: institution.city,
      country: institution.country,
      address: institution.address,
      logoUrl: logoFile?.publicUrl,
      logo: logoFile,
      logoFile,
      isBlocked: institution.isBlocked,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
    };
  }

  async update(user: UserData, updateInstitutionDto: UpdateInstitutionDto) {
    const institution = await this.findInstitutionForOwner(user);

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    // Check if prefix is being updated and if it already exists
    if (
      updateInstitutionDto?.prefix &&
      updateInstitutionDto?.prefix !== institution?.prefix
    ) {
      const existingInstitution = await this.institutionRepository.findOne({
        where: { prefix: updateInstitutionDto.prefix },
      });

      if (existingInstitution) {
        throw new ConflictException(
          'Institution with this prefix already exists',
        );
      }
    }

    // Update only the provided fields
    Object.assign(institution, updateInstitutionDto);
    return await this.institutionRepository.save(institution);
  }

  async updateStatus(updateStatusDto: UpdateInstitutionStatusDto) {
    const { prefix, isBlocked, message } = updateStatusDto;

    const institution = await this.institutionRepository.findOne({
      where: { prefix },
      relations: ['owner'],
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    // Check if the status is already the same
    if (institution.isBlocked === isBlocked) {
      const statusText = isBlocked ? 'blocked' : 'unblocked';
      throw new ConflictException(`Institution is already ${statusText}`);
    }

    institution.isBlocked = isBlocked;

    try {
      const updatedInstitution =
        await this.institutionRepository.save(institution);

      // Send email notification when status changes
      if (institution.owner) {
        try {
          const templateFileName = isBlocked
            ? 'institution_blocked.template.html'
            : 'institution_unblocked.template.html';

          const templatePath = join(
            process.cwd(),
            'src',
            'shared',
            'emails',
            templateFileName,
          );
          const templateSource = readFileSync(templatePath, 'utf-8');
          const template = Handlebars.compile(templateSource);
          const htmlContent = template({
            institutionName: institution.name,
            institutionPrefix: institution.prefix,
            ownerEmail: institution.owner.email,
            reason: message,
            message: message,
          });

          const subject = isBlocked
            ? `⚠️ Your Institution "${institution.name}" Has Been Blocked - Edunexs`
            : `✅ Your Institution "${institution.name}" Has Been Unblocked - Edunexs`;

          await this.brevoService.sendEmail({
            to: [
              {
                email: institution.owner.email,
                name: institution.owner.name || institution.owner.email,
              },
            ],
            subject,
            htmlContent,
          });
        } catch (error) {
          this.logger.error(
            'Failed to send institution status update email',
            error,
          );
          // Don't throw error, continue with status update
        }
      }

      return {
        prefix: updatedInstitution?.prefix,
        name: updatedInstitution?.name,
        isBlocked: updatedInstitution?.isBlocked,
        message: isBlocked
          ? 'Institution blocked successfully'
          : 'Institution unblocked successfully',
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to update institution status',
      );
    }
  }

  async uploadLogo(user: UserData, logoFile: Express.Multer.File) {
    // Find institution by token institutionId first, then owner fallback
    const institution = await this.findInstitutionForOwner(user, ['logoFile']);

    if (!institution) {
      throw new NotFoundException(
        'Institution not found. Please create an institution first.',
      );
    }

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (logoFile.size > maxFileSize) {
      throw new BadRequestException('Logo size exceeds 5MB limit');
    }

    try {
      // Upload to Appwrite
      const uploadResult = await this.appwriteStorageService.uploadFile({
        file: logoFile.buffer,
        fileName: logoFile.originalname,
        mimeType: logoFile.mimetype,
      });

      // Save file record in database
      const fileRecord = this.fileRepository.create({
        fileName: uploadResult.fileName,
        fileId: uploadResult.fileId,
        mimeType: uploadResult.mimeType,
        sizeOriginal: uploadResult.sizeOriginal,
      });

      const savedFile = await this.fileRepository.save(fileRecord);

      // Link logo to institution
      institution.logoFile = savedFile;
      await this.institutionRepository.save(institution);

      this.logger.log(
        `Logo uploaded successfully for institution ${institution.prefix}`,
      );

      // Generate public URL on response
      const publicUrl = this.appwriteStorageService.getFileViewUrl({
        fileId: uploadResult.fileId,
      });

      return {
        success: true,
        message: 'Logo uploaded successfully',
        dbFileId: savedFile.id,
        appwriteFileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        mimeType: uploadResult.mimeType,
        sizeOriginal: uploadResult.sizeOriginal,
        publicUrl: publicUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload logo for institution ${institution.prefix}`,
        error instanceof Error ? error.message : '',
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to upload logo');
    }
  }

  private async findInstitutionForOwner(
    user: UserData,
    relations: string[] = [],
  ) {
    if (user.institutionId) {
      const byToken = await this.institutionRepository.findOne({
        where: {
          prefix: user.institutionId,
          owner: { id: user.authId },
        },
        relations,
      });

      if (byToken) {
        return byToken;
      }
    }

    return await this.institutionRepository.findOne({
      where: { owner: { id: user.authId } },
      relations,
    });
  }

  /**
   * Get institution by prefix (institutionId) from JWT token
   * Works for any role: INSTITUTION_OWNER, INSTITUTION_ADMIN, etc.
   */
  async findMyInstitution(user: UserData) {
    if (!user.institutionId) {
      throw new NotFoundException('Institution not found in token');
    }

    const institution = await this.institutionRepository.findOne({
      where: { prefix: user.institutionId },
      relations: ['owner', 'logoFile'],
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    // Format response with logo file data if available
    const logoFile = institution.logoFile
      ? {
          dbFileId: institution.logoFile.id,
          appwriteFileId: institution.logoFile.fileId,
          fileName: institution.logoFile.fileName,
          mimeType: institution.logoFile.mimeType,
          sizeOriginal: institution.logoFile.sizeOriginal,
          publicUrl: this.appwriteStorageService.getFileViewUrl({
            fileId: institution.logoFile.fileId,
          }),
        }
      : null;

    return {
      prefix: institution.prefix,
      name: institution.name,
      city: institution.city,
      country: institution.country,
      address: institution.address,
      logoUrl: logoFile?.publicUrl,
      logo: logoFile,
      logoFile,
      isBlocked: institution.isBlocked,
      createdAt: institution.createdAt,
      updatedAt: institution.updatedAt,
    };
  }
}
