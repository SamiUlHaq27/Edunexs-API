import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { InstitutionEntity } from 'src/database/entities';
import { CreateInstitutionDto } from './dtos';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';

@Injectable()
export class InstitutionService {
  constructor(
    @InjectRepository(InstitutionEntity)
    private readonly institutionRepository: Repository<InstitutionEntity>,
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
    const where: Record<string, any> = {};

    if (filters && Object.keys(filters).length > 0) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          // Handle createdAt with Between operator for date range
          if (key === 'createdAt' && typeof value === 'object') {
            const dateFilter = value as { start?: string; end?: string };
            if (dateFilter.start && dateFilter.end) {
              where[key] = Between(
                new Date(dateFilter.start),
                new Date(dateFilter.end),
              );
            } else if (dateFilter.start) {
              where[key] = Between(new Date(dateFilter.start), new Date());
            } else if (dateFilter.end) {
              where[key] = Between(new Date(0), new Date(dateFilter.end));
            }
          } else if (allowedAttributes.includes(key)) {
            where[key] = value;
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
}
