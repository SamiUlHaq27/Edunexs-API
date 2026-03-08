import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { InstitutionContextService } from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { FindOptionsWhere, In, Like, Repository } from 'typeorm';
import { CreateStudentGroupDto } from './dtos/create-student-group.dto';
import { DeleteStudentGroupDto } from './dtos/delete-student-group.dto';
import { UpdateStudentGroupDto } from './dtos/update-student-group.dto';

@Injectable()
export class StudentGroupService {
  constructor(
    @InjectRepository(StudentGroupEntity)
    private readonly studentGroupRepository: Repository<StudentGroupEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createStudentGroup(
    createStudentGroupDto: CreateStudentGroupDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const normalizedName = createStudentGroupDto.name.trim();

    const existingGroup = await this.studentGroupRepository.findOne({
      where: {
        name: normalizedName,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['institution'],
    });

    if (existingGroup) {
      throw new ConflictException(
        'Group with this name already exists in your institution',
      );
    }

    const studentProfiles = await this.getValidatedStudentProfiles(
      managerInstitution.prefix,
      createStudentGroupDto?.studentProfileIds,
    );

    const newGroup = this.studentGroupRepository.create({
      name: normalizedName,
      isActive: true,
      institution: { prefix: managerInstitution.prefix },
      students: studentProfiles,
    });

    try {
      const savedGroup = await this.studentGroupRepository.save(newGroup);

      return this.buildGroupResponse(savedGroup, studentProfiles);
    } catch {
      throw new InternalServerErrorException('Failed to create student group');
    }
  }

  async listStudentGroups(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<StudentGroupEntity> = {
      institution: { prefix: managerInstitution.prefix },
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

    const [data, total] = await this.studentGroupRepository.findAndCount({
      where,
      relations: ['institution', 'students', 'students.student'],
      skip,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return {
      data: data.map((group) => this.buildGroupResponse(group, group.students)),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateStudentGroup(
    updateStudentGroupDto: UpdateStudentGroupDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { groupId, name, isActive, studentProfileIds } =
      updateStudentGroupDto;

    const studentGroup = await this.studentGroupRepository.findOne({
      where: {
        id: groupId,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['institution', 'students', 'students.student'],
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    if (name !== undefined && name.trim() !== studentGroup.name) {
      const normalizedName = name.trim();
      const existingGroup = await this.studentGroupRepository.findOne({
        where: {
          name: normalizedName,
          institution: { prefix: managerInstitution.prefix },
        },
        relations: ['institution'],
      });

      if (existingGroup && existingGroup.id !== studentGroup.id) {
        throw new ConflictException(
          'Group with this name already exists in your institution',
        );
      }

      studentGroup.name = normalizedName;
    }

    if (isActive !== undefined) {
      studentGroup.isActive = isActive;
    }

    let nextStudents = studentGroup.students;
    if (studentProfileIds !== undefined) {
      nextStudents = await this.getValidatedStudentProfiles(
        managerInstitution.prefix,
        studentProfileIds,
      );
      studentGroup.students = nextStudents;
    }

    try {
      const updatedGroup = await this.studentGroupRepository.save(studentGroup);

      return this.buildGroupResponse(updatedGroup, nextStudents);
    } catch {
      throw new InternalServerErrorException('Failed to update student group');
    }
  }

  async deleteStudentGroup(
    deleteStudentGroupDto: DeleteStudentGroupDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const studentGroup = await this.studentGroupRepository.findOne({
      where: {
        id: deleteStudentGroupDto.groupId,
        institution: { prefix: managerInstitution.prefix },
      },
      relations: ['institution', 'students'],
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    try {
      await this.studentGroupRepository.manager.transaction(async (manager) => {
        const groupRepository = manager.getRepository(StudentGroupEntity);

        studentGroup.students = [];
        await groupRepository.save(studentGroup);
        await groupRepository.softDelete(studentGroup.id);
      });

      return {
        success: true,
        message: 'Student group deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException('Failed to delete student group');
    }
  }

  private async getValidatedStudentProfiles(
    institutionPrefix: string,
    studentProfileIds: number[],
  ) {
    if (!studentProfileIds?.length) {
      return [];
    }

    const uniqueStudentProfileIds = [...new Set(studentProfileIds)];

    const studentProfiles = await this.studentProfileRepository.find({
      where: {
        id: In(uniqueStudentProfileIds),
        institution: { prefix: institutionPrefix },
      },
      relations: ['student', 'institution'],
    });

    if (studentProfiles.length !== uniqueStudentProfileIds.length) {
      throw new NotFoundException(
        'One or more students do not exist in your institution',
      );
    }

    const hasInvalidRole = studentProfiles.some(
      (studentProfile) => studentProfile.student.role !== UserRoles.STUDENT,
    );

    if (hasInvalidRole) {
      throw new ConflictException(
        'Only students can be added to student groups',
      );
    }

    return studentProfiles;
  }

  private buildGroupResponse(
    studentGroup: StudentGroupEntity,
    studentProfiles: StudentProfileEntity[],
  ) {
    return {
      id: studentGroup.id,
      name: studentGroup.name,
      isActive: studentGroup.isActive,
      institutionPrefix: studentGroup.institution?.prefix,
      studentProfileIds: studentProfiles.map(
        (studentProfile) => studentProfile.id,
      ),
      studentIds: studentProfiles.map(
        (studentProfile) => studentProfile.student.id,
      ),
      createdAt: studentGroup.createdAt,
      updatedAt: studentGroup.updatedAt,
    };
  }
}
