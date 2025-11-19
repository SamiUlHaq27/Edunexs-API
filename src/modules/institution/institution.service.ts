import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { InstitutionEntity } from 'src/database/entities';
import { CreateInstitutionDto, UpdateInstitutionStatusDto } from './dtos';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { BrevoService } from 'src/shared/services/brevo.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class InstitutionService {
  private logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
    private readonly brevoService: BrevoService,
  ) {}

  async create(createInstitutionDto: CreateInstitutionDto, ownerId: number) {
    const { prefix, name, city, country, address, logoUrl } =
      createInstitutionDto;

    // Check if owner already has an institution
    const ownerInstitution = await this.institutionRepository.findOne({
      where: { ownerId },
    });

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
      logoUrl,
      ownerId,
    });

    try {
      const savedInstitution =
        await this.institutionRepository.save(newInstitution);

      return {
        prefix: savedInstitution?.prefix,
        name: savedInstitution?.name,
        city: savedInstitution?.city,
        country: savedInstitution?.country,
        address: savedInstitution?.address,
        logoUrl: savedInstitution?.logoUrl,
        ownerId: savedInstitution?.ownerId,
        createdAt: savedInstitution?.createdAt,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create institution');
    }
  }

  async findAll() {
    return await this.institutionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(listFiltersDto: ListFiltersDto) {
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    // Define allowed institution attributes for filtering
    const allowedAttributes = [
      'prefix',
      'name',
      'city',
      'country',
      'address',
      'logoUrl',
      'ownerId',
    ];

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
            if (k === 'ownerId') {
              const ownerId = typeof value === 'number' ? value : Number(value);
              if (!Number.isNaN(ownerId)) {
                where[k] = ownerId;
              }
            } else {
              where[k as keyof typeof allowedAttributes] = String(value);
            }
          }
        }
      }
    }

    const [data, total] = await this.institutionRepository.findAndCount({
      where,
      relations: ['owner'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async findOne(prefix: string) {
    return await this.institutionRepository.findOne({
      where: { prefix },
    });
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
            ownerEmail: institution.owner.username,
            reason: message,
            message: message,
          });

          const subject = isBlocked
            ? `⚠️ Your Institution "${institution.name}" Has Been Blocked - Edunexs`
            : `✅ Your Institution "${institution.name}" Has Been Unblocked - Edunexs`;

          await this.brevoService.sendEmail({
            to: [
              {
                email: institution.owner.username,
                name: institution.owner.name || institution.owner.username,
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
}
