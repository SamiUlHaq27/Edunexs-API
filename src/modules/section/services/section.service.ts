import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SectionEntity, SectionOfferingEntity } from 'src/database/entities';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { InstitutionContextService } from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateSectionDto, DeleteSectionDto, UpdateSectionDto } from '../dtos';

@Injectable()
export class SectionService {
  constructor(
    @InjectRepository(SectionEntity)
    private readonly sectionRepository: Repository<SectionEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createSection(createSectionDto: CreateSectionDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const normalizedName = createSectionDto.name.trim();

    const existingSection = await this.sectionRepository.findOne({
      where: {
        name: normalizedName,
        institution: { id: managerInstitution.id },
      },
      relations: ['institution'],
    });

    if (existingSection) {
      throw new ConflictException(
        'Section with this name already exists in your institution',
      );
    }

    const newSection = this.sectionRepository.create({
      name: normalizedName,
      isActive: true,
      institution: { id: managerInstitution.id },
    });

    try {
      const savedSection = await this.sectionRepository.save(newSection);
      return this.buildSectionResponse(savedSection);
    } catch {
      throw new InternalServerErrorException('Failed to create section');
    }
  }

  async listSections(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<SectionEntity> = {
      institution: { id: managerInstitution.id },
    };

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typeof typedFilters.name === 'string') {
        where.name = Like(`%${typedFilters.name}%`);
      }

      if (typedFilters.isActive !== undefined) {
        const isActiveValue = typedFilters.isActive;
        if (typeof isActiveValue === 'string') {
          where.isActive = isActiveValue === 'true';
        } else if (typeof isActiveValue === 'boolean') {
          where.isActive = isActiveValue;
        }
      }
    }

    const [data, total] = await this.sectionRepository.findAndCount({
      where,
      relations: ['institution', 'offerings'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      data: data.map((sectionEntity) =>
        this.buildSectionResponse(sectionEntity),
      ),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateSection(updateSectionDto: UpdateSectionDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { sectionId, name, isActive } = updateSectionDto;

    const sectionEntity = await this.sectionRepository.findOne({
      where: {
        id: sectionId,
        institution: { id: managerInstitution.id },
      },
      relations: ['institution', 'offerings'],
    });

    if (!sectionEntity) {
      throw new NotFoundException('Section not found');
    }

    if (name !== undefined && name.trim() !== sectionEntity.name) {
      const normalizedName = name.trim();

      const existingSection = await this.sectionRepository.findOne({
        where: {
          name: normalizedName,
          institution: { id: managerInstitution.id },
        },
        relations: ['institution'],
      });

      if (existingSection && existingSection.id !== sectionEntity.id) {
        throw new ConflictException(
          'Section with this name already exists in your institution',
        );
      }

      sectionEntity.name = normalizedName;
    }

    if (isActive !== undefined) {
      sectionEntity.isActive = isActive;
    }

    try {
      const updatedSection = await this.sectionRepository.save(sectionEntity);
      return this.buildSectionResponse(updatedSection);
    } catch {
      throw new InternalServerErrorException('Failed to update section');
    }
  }

  async deleteSection(deleteSectionDto: DeleteSectionDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const sectionEntity = await this.sectionRepository.findOne({
      where: {
        id: deleteSectionDto.sectionId,
        institution: { id: managerInstitution.id },
      },
      relations: ['institution'],
    });

    if (!sectionEntity) {
      throw new NotFoundException('Section not found');
    }

    try {
      await this.sectionRepository.manager.transaction(async (manager) => {
        const sectionOfferingRepository = manager.getRepository(
          SectionOfferingEntity,
        );
        const sectionRepository = manager.getRepository(SectionEntity);

        const offerings = await sectionOfferingRepository.find({
          where: { section: { id: sectionEntity.id } },
          relations: ['students'],
        });

        for (const offering of offerings) {
          offering.students = [];
          await sectionOfferingRepository.save(offering);
          await sectionOfferingRepository.softDelete(offering.id);
        }

        await sectionRepository.softDelete(sectionEntity.id);
      });

      return {
        success: true,
        message: 'Section deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete section');
    }
  }

  private buildSectionResponse(sectionEntity: SectionEntity) {
    return {
      id: sectionEntity.id,
      name: sectionEntity.name,
      isActive: sectionEntity.isActive,
      institutionPrefix: sectionEntity.institution?.prefix,
      offeringCount: sectionEntity.offerings?.length || 0,
      createdAt: sectionEntity.createdAt,
      updatedAt: sectionEntity.updatedAt,
    };
  }
}
