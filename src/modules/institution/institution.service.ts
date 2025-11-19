import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstitutionEntity } from 'src/database/entities';
import { CreateInstitutionDto } from './dtos';

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

  async findOne(prefix: string) {
    return await this.institutionRepository.findOne({
      where: { prefix },
    });
  }
}
