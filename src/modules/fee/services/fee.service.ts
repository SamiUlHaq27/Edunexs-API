import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FeeEntity,
  FeeStatus,
  ParentStudentEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { InstitutionContextService } from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { FindOptionsWhere, In, Like, Repository } from 'typeorm';
import { CreateFeeDto, DeleteFeeDto, UpdateFeeDto } from '../dtos';

@Injectable()
export class FeeService {
  constructor(
    @InjectRepository(FeeEntity)
    private readonly feeRepository: Repository<FeeEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(StudentGroupEntity)
    private readonly studentGroupRepository: Repository<StudentGroupEntity>,
    @InjectRepository(ParentStudentEntity)
    private readonly parentStudentRepository: Repository<ParentStudentEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createFee(createFeeDto: CreateFeeDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const studentProfiles = await this.getResolvedStudentProfiles(
      managerInstitution.prefix,
      createFeeDto.studentProfileIds,
      createFeeDto.studentGroupIds,
    );

    if (!studentProfiles.length) {
      throw new BadRequestException(
        'At least one student or group is required to create invoices',
      );
    }

    const normalizedTitle = createFeeDto.title.trim();
    const status = createFeeDto.status ?? 'PENDING';
    const paidAt = this.resolvePaidAt(status, createFeeDto.paidAt);

    try {
      const createdFees = await this.feeRepository.manager.transaction(
        async (manager) => {
          const txFeeRepository = manager.getRepository(FeeEntity);

          const newInvoices = studentProfiles.map((studentProfile, index) =>
            txFeeRepository.create({
              invoiceNo: this.generateInvoiceNo(
                managerInstitution.prefix,
                studentProfile.id,
                index,
              ),
              title: normalizedTitle,
              amount: createFeeDto.amount,
              dueDate: createFeeDto.dueDate,
              paidAt,
              status,
              studentProfile: { id: studentProfile.id },
              institution: { prefix: managerInstitution.prefix },
            }),
          );

          return await txFeeRepository.save(newInvoices);
        },
      );

      const feeIds = createdFees.map((fee) => fee.id);

      const feesWithRelations = await this.feeRepository.find({
        where: { id: In(feeIds) },
        relations: ['studentProfile', 'studentProfile.student', 'institution'],
        order: { createdAt: 'DESC' },
      });

      return {
        createdCount: feesWithRelations.length,
        data: feesWithRelations.map((fee) => this.buildFeeResponse(fee)),
      };
    } catch {
      throw new InternalServerErrorException('Failed to create invoices');
    }
  }

  async listFees(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where = this.buildListWhere(
      managerInstitution.prefix,
      filters as Record<string, unknown>,
    );

    const [data, total] = await this.feeRepository.findAndCount({
      where,
      relations: ['studentProfile', 'studentProfile.student', 'institution'],
      order: { createdAt: 'DESC' },
      skip,
      take: size,
    });

    return {
      data: data.map((fee) => this.buildFeeResponse(fee)),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async listStudentFees(listFiltersDto: ListFiltersDto, user: UserData) {
    let studentProfile: StudentProfileEntity | null = null;

    if (user.role === UserRoles.STUDENT) {
      studentProfile = await this.studentProfileRepository.findOne({
        where: { student: { id: user.authId } },
        relations: ['student', 'institution'],
      });
    } else if (user.role === UserRoles.PARENT) {
      const filters =
        listFiltersDto.filters && typeof listFiltersDto.filters === 'object'
          ? (listFiltersDto.filters as Record<string, unknown>)
          : {};

      const selectedStudentProfileId =
        filters.studentProfileId !== undefined
          ? Number(filters.studentProfileId)
          : user.studentProfileId;

      if (!selectedStudentProfileId || Number.isNaN(selectedStudentProfileId)) {
        throw new BadRequestException('A student profile is required');
      }

      const link = await this.parentStudentRepository.findOne({
        where: {
          parent: { id: user.authId },
          studentProfile: { id: selectedStudentProfileId },
        },
      });

      if (!link) {
        throw new NotFoundException(
          'Selected student is not linked to this parent account',
        );
      }

      studentProfile = await this.studentProfileRepository.findOne({
        where: { id: selectedStudentProfileId },
        relations: ['student', 'institution'],
      });
    }

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const page = listFiltersDto.page;
    const size = listFiltersDto.size;
    const skip = (page - 1) * size;
    const filters =
      listFiltersDto.filters && typeof listFiltersDto.filters === 'object'
        ? (listFiltersDto.filters as Record<string, unknown>)
        : {};

    const statusFilter = this.toFeeStatus(filters.status);
    const search =
      typeof filters.search === 'string' ? filters.search.trim() : '';

    const baseWhere: FindOptionsWhere<FeeEntity> = {
      institution: { prefix: studentProfile.institution?.prefix },
      studentProfile: { id: studentProfile.id },
    };

    const withStatus = (where: FindOptionsWhere<FeeEntity>) => {
      if (!statusFilter) {
        return where;
      }

      return {
        ...where,
        status: statusFilter,
      };
    };

    const where: FindOptionsWhere<FeeEntity>[] | FindOptionsWhere<FeeEntity> =
      search
        ? [
            withStatus({ ...baseWhere, invoiceNo: Like(`%${search}%`) }),
            withStatus({ ...baseWhere, title: Like(`%${search}%`) }),
          ]
        : withStatus(baseWhere);

    const [data, total] = await this.feeRepository.findAndCount({
      where,
      relations: ['studentProfile', 'studentProfile.student', 'institution'],
      order: { createdAt: 'DESC' },
      skip,
      take: size,
    });

    return {
      data: data.map((fee) => this.buildFeeResponse(fee)),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateFee(updateFeeDto: UpdateFeeDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const fee = await this.feeRepository.findOne({
      where: {
        id: updateFeeDto.feeId,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['studentProfile', 'studentProfile.student', 'institution'],
    });

    if (!fee) {
      throw new NotFoundException('Invoice not found');
    }

    if (updateFeeDto.title !== undefined) {
      const title = updateFeeDto.title.trim();
      if (!title) {
        throw new BadRequestException('Title cannot be empty');
      }
      fee.title = title;
    }

    if (updateFeeDto.amount !== undefined) {
      fee.amount = updateFeeDto.amount;
    }

    if (updateFeeDto.dueDate !== undefined) {
      fee.dueDate = updateFeeDto.dueDate;
    }

    if (updateFeeDto.studentProfileId !== undefined) {
      const studentProfile = await this.getValidatedStudentProfile(
        updateFeeDto.studentProfileId,
        managerInstitution.prefix,
      );

      fee.studentProfile = studentProfile;
    }

    if (updateFeeDto.status !== undefined) {
      fee.status = updateFeeDto.status;
    }

    if (updateFeeDto.paidAt !== undefined) {
      fee.paidAt = new Date(updateFeeDto.paidAt);
    } else if (updateFeeDto.status !== undefined) {
      fee.paidAt =
        updateFeeDto.status === 'PAID' ? fee.paidAt || new Date() : null;
    }

    if (
      updateFeeDto.paidAt !== undefined &&
      updateFeeDto.status === undefined
    ) {
      fee.status = 'PAID';
    }

    try {
      const updatedFee = await this.feeRepository.save(fee);

      const updatedWithRelations = await this.feeRepository.findOne({
        where: { id: updatedFee.id },
        relations: ['studentProfile', 'studentProfile.student', 'institution'],
      });

      if (!updatedWithRelations) {
        throw new InternalServerErrorException(
          'Failed to load updated invoice',
        );
      }

      return this.buildFeeResponse(updatedWithRelations);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update invoice');
    }
  }

  async deleteFee(deleteFeeDto: DeleteFeeDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const fee = await this.feeRepository.findOne({
      where: {
        id: deleteFeeDto.feeId,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['institution'],
    });

    if (!fee) {
      throw new NotFoundException('Invoice not found');
    }

    try {
      await this.feeRepository.softDelete(fee.id);

      return {
        success: true,
        message: 'Invoice deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete invoice');
    }
  }

  private buildListWhere(
    institutionPrefix: string,
    filters: Record<string, unknown>,
  ): FindOptionsWhere<FeeEntity>[] | FindOptionsWhere<FeeEntity> {
    const baseWhere: FindOptionsWhere<FeeEntity> = {
      institution: { prefix: institutionPrefix },
    };

    if (!filters || typeof filters !== 'object') {
      return baseWhere;
    }

    const statusFilter = this.toFeeStatus(filters.status);
    const studentProfileIdFilter =
      filters.studentProfileId !== undefined
        ? Number(filters.studentProfileId)
        : undefined;
    const search =
      typeof filters.search === 'string' ? filters.search.trim() : '';

    const applyCommonFilters = (
      where: FindOptionsWhere<FeeEntity>,
    ): FindOptionsWhere<FeeEntity> => {
      const nextWhere: FindOptionsWhere<FeeEntity> = { ...where };

      if (statusFilter) {
        nextWhere.status = statusFilter;
      }

      if (
        studentProfileIdFilter !== undefined &&
        !Number.isNaN(studentProfileIdFilter)
      ) {
        nextWhere.studentProfile = {
          ...(nextWhere.studentProfile || {}),
          id: studentProfileIdFilter,
        };
      }

      return nextWhere;
    };

    if (!search) {
      return applyCommonFilters(baseWhere);
    }

    return [
      applyCommonFilters({ ...baseWhere, invoiceNo: Like(`%${search}%`) }),
      applyCommonFilters({ ...baseWhere, title: Like(`%${search}%`) }),
      applyCommonFilters({
        ...baseWhere,
        studentProfile: { rollNo: Like(`%${search}%`) },
      }),
      applyCommonFilters({
        ...baseWhere,
        studentProfile: { student: { name: Like(`%${search}%`) } },
      }),
    ];
  }

  private async getResolvedStudentProfiles(
    institutionPrefix: string,
    studentProfileIds?: number[],
    studentGroupIds?: number[],
  ) {
    const profileIdSet = new Set<number>();

    if (studentProfileIds?.length) {
      for (const id of studentProfileIds) {
        profileIdSet.add(id);
      }
    }

    if (studentGroupIds?.length) {
      const uniqueGroupIds = [...new Set(studentGroupIds)];

      const groups = await this.studentGroupRepository.find({
        where: {
          id: In(uniqueGroupIds),
          institution: { prefix: institutionPrefix },
        },
        relations: ['students', 'students.student', 'institution'],
      });

      if (groups.length !== uniqueGroupIds.length) {
        throw new NotFoundException(
          'One or more student groups do not exist in your institution',
        );
      }

      for (const group of groups) {
        for (const profile of group.students || []) {
          profileIdSet.add(profile.id);
        }
      }
    }

    if (!profileIdSet.size) {
      return [];
    }

    const uniqueProfileIds = [...profileIdSet];
    const studentProfiles = await this.studentProfileRepository.find({
      where: {
        id: In(uniqueProfileIds),
        institution: { prefix: institutionPrefix },
      },
      relations: ['student', 'institution'],
    });

    if (studentProfiles.length !== uniqueProfileIds.length) {
      throw new NotFoundException(
        'One or more students do not exist in your institution',
      );
    }

    const hasInvalidRole = studentProfiles.some(
      (studentProfile) => studentProfile.student.role !== UserRoles.STUDENT,
    );

    if (hasInvalidRole) {
      throw new ConflictException('Only students can receive invoices');
    }

    return studentProfiles;
  }

  private async getValidatedStudentProfile(
    studentProfileId: number,
    institutionPrefix: string,
  ) {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        id: studentProfileId,
        institution: { prefix: institutionPrefix },
      },
      relations: ['student', 'institution'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student not found in your institution');
    }

    if (studentProfile.student.role !== UserRoles.STUDENT) {
      throw new ConflictException('Only students can receive invoices');
    }

    return studentProfile;
  }

  private resolvePaidAt(status: FeeStatus, paidAt?: string): Date | null {
    if (paidAt) {
      return new Date(paidAt);
    }

    if (status === 'PAID') {
      return new Date();
    }

    return null;
  }

  private toFeeStatus(value: unknown): FeeStatus | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.toUpperCase();
    if (
      normalized === 'PENDING' ||
      normalized === 'PAID' ||
      normalized === 'OVERDUE'
    ) {
      return normalized;
    }

    return undefined;
  }

  private generateInvoiceNo(
    institutionPrefix: string,
    studentProfileId: number,
    index: number,
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const timestampSuffix = String(now.getTime()).slice(-6);
    const studentSuffix = String(studentProfileId).padStart(4, '0').slice(-4);
    const indexSuffix = String(index).padStart(3, '0').slice(-3);

    return `INV-${institutionPrefix}-${year}-${timestampSuffix}${studentSuffix}${indexSuffix}`;
  }

  private buildFeeResponse(fee: FeeEntity) {
    return {
      id: fee.id,
      invoiceNo: fee.invoiceNo,
      title: fee.title,
      amount: fee.amount,
      dueDate: fee.dueDate,
      paidAt: fee.paidAt,
      status: fee.status,
      institutionPrefix: fee.institution?.prefix,
      studentProfileId: fee.studentProfile?.id,
      studentId: fee.studentProfile?.student?.id,
      studentName: fee.studentProfile?.student?.name,
      rollNo: fee.studentProfile?.rollNo,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt,
    };
  }
}
