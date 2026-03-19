import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthEntity,
  CourseEntity,
  SectionEntity,
  SectionOfferingEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { UserRoles } from 'src/shared/consts';
import { ListFiltersDto } from 'src/shared/dtos/list_filter.dto';
import { InstitutionContextService } from 'src/shared/services';
import { UserData } from 'src/shared/types';
import { In, Like, Repository } from 'typeorm';
import {
  CreateSectionOfferingDto,
  DeleteSectionOfferingDto,
  UpdateSectionOfferingDto,
} from '../dtos';

@Injectable()
export class SectionOfferingService {
  constructor(
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    @InjectRepository(SectionEntity)
    private readonly sectionRepository: Repository<SectionEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(StudentGroupEntity)
    private readonly studentGroupRepository: Repository<StudentGroupEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async createSectionOffering(
    createSectionOfferingDto: CreateSectionOfferingDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const sectionEntity = await this.getSectionInInstitution(
      createSectionOfferingDto.sectionId,
      managerInstitution.prefix,
    );
    const course = await this.getCourseInInstitution(
      createSectionOfferingDto.courseId,
      managerInstitution.prefix,
    );
    const teacher = await this.getTeacherInInstitution(
      createSectionOfferingDto.teacherId,
      managerInstitution.prefix,
    );

    const existingOffering = await this.sectionOfferingRepository.findOne({
      where: {
        section: { id: sectionEntity.id },
        course: { id: course.id },
      },
      relations: ['section', 'course'],
    });

    if (existingOffering) {
      throw new ConflictException(
        'This section already has an offering for the selected course',
      );
    }

    const students = await this.getResolvedStudentProfiles(
      managerInstitution.prefix,
      createSectionOfferingDto.studentProfileIds,
      createSectionOfferingDto.studentGroupIds,
    );

    const offering = this.sectionOfferingRepository.create({
      section: { id: sectionEntity.id },
      course: { id: course.id },
      teacher: { id: teacher.id },
      students,
      isActive: true,
    });

    try {
      const savedOffering = await this.sectionOfferingRepository.save(offering);

      const offeringWithRelations =
        await this.sectionOfferingRepository.findOne({
          where: { id: savedOffering.id },
          relations: [
            'section',
            'section.institution',
            'course',
            'teacher',
            'students',
            'students.student',
          ],
        });

      if (!offeringWithRelations) {
        throw new InternalServerErrorException(
          'Failed to load section offering',
        );
      }

      return this.buildOfferingResponse(offeringWithRelations);
    } catch {
      throw new InternalServerErrorException(
        'Failed to create section offering',
      );
    }
  }

  async listSectionOfferings(listFiltersDto: ListFiltersDto, user: UserData) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);
    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where: Record<string, unknown> = {
      section: { institution: { prefix: managerInstitution.prefix } },
    };

    if (filters && typeof filters === 'object') {
      const typedFilters = filters as Record<string, unknown>;

      if (typedFilters.sectionId !== undefined) {
        where.section = {
          ...(where.section as Record<string, unknown>),
          id: Number(typedFilters.sectionId),
        };
      }

      if (typedFilters.courseId !== undefined) {
        where.course = { id: Number(typedFilters.courseId) };
      }

      if (typedFilters.teacherId !== undefined) {
        where.teacher = { id: Number(typedFilters.teacherId) };
      }

      if (typeof typedFilters.name === 'string') {
        where.section = {
          ...(where.section as Record<string, unknown>),
          name: Like(`%${typedFilters.name}%`),
        };
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

    const [data, total] = await this.sectionOfferingRepository.findAndCount({
      where,
      relations: [
        'section',
        'section.institution',
        'course',
        'teacher',
        'students',
        'students.student',
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: size,
    });

    return {
      data: data.map((offering) => this.buildOfferingResponse(offering)),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async updateSectionOffering(
    updateSectionOfferingDto: UpdateSectionOfferingDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const offering = await this.sectionOfferingRepository.findOne({
      where: {
        id: updateSectionOfferingDto.offeringId,
        section: { institution: { prefix: managerInstitution.prefix } },
      },
      relations: [
        'section',
        'section.institution',
        'course',
        'teacher',
        'students',
        'students.student',
      ],
    });

    if (!offering) {
      throw new NotFoundException('Section offering not found');
    }

    if (
      updateSectionOfferingDto.courseId !== undefined &&
      updateSectionOfferingDto.courseId !== offering.course.id
    ) {
      const nextCourse = await this.getCourseInInstitution(
        updateSectionOfferingDto.courseId,
        managerInstitution.prefix,
      );

      const existingOffering = await this.sectionOfferingRepository.findOne({
        where: {
          section: { id: offering.section.id },
          course: { id: nextCourse.id },
        },
        relations: ['section', 'course'],
      });

      if (existingOffering && existingOffering.id !== offering.id) {
        throw new ConflictException(
          'This section already has an offering for the selected course',
        );
      }

      offering.course = { id: nextCourse.id } as CourseEntity;
    }

    if (
      updateSectionOfferingDto.teacherId !== undefined &&
      updateSectionOfferingDto.teacherId !== offering.teacher.id
    ) {
      const nextTeacher = await this.getTeacherInInstitution(
        updateSectionOfferingDto.teacherId,
        managerInstitution.prefix,
      );
      offering.teacher = { id: nextTeacher.id } as AuthEntity;
    }

    if (updateSectionOfferingDto.isActive !== undefined) {
      offering.isActive = updateSectionOfferingDto.isActive;
    }

    if (
      updateSectionOfferingDto.studentProfileIds !== undefined ||
      updateSectionOfferingDto.studentGroupIds !== undefined
    ) {
      const nextStudents = await this.getResolvedStudentProfiles(
        managerInstitution.prefix,
        updateSectionOfferingDto.studentProfileIds,
        updateSectionOfferingDto.studentGroupIds,
      );

      offering.students = nextStudents;
    }

    try {
      const updatedOffering =
        await this.sectionOfferingRepository.save(offering);

      const offeringWithRelations =
        await this.sectionOfferingRepository.findOne({
          where: { id: updatedOffering.id },
          relations: [
            'section',
            'section.institution',
            'course',
            'teacher',
            'students',
            'students.student',
          ],
        });

      if (!offeringWithRelations) {
        throw new InternalServerErrorException(
          'Failed to load section offering',
        );
      }

      return this.buildOfferingResponse(offeringWithRelations);
    } catch {
      throw new InternalServerErrorException(
        'Failed to update section offering',
      );
    }
  }

  async deleteSectionOffering(
    deleteSectionOfferingDto: DeleteSectionOfferingDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const offering = await this.sectionOfferingRepository.findOne({
      where: {
        id: deleteSectionOfferingDto.offeringId,
        section: { institution: { prefix: managerInstitution.prefix } },
      },
      relations: ['section', 'section.institution', 'students'],
    });

    if (!offering) {
      throw new NotFoundException('Section offering not found');
    }

    try {
      await this.sectionOfferingRepository.manager.transaction(
        async (manager) => {
          const offeringRepository = manager.getRepository(
            SectionOfferingEntity,
          );

          offering.students = [];
          await offeringRepository.save(offering);
          await offeringRepository.softDelete(offering.id);
        },
      );

      return {
        success: true,
        message: 'Section offering deleted successfully',
      };
    } catch {
      throw new InternalServerErrorException(
        'Failed to delete section offering',
      );
    }
  }

  private async getSectionInInstitution(
    sectionId: number,
    institutionPrefix: string,
  ) {
    const sectionEntity = await this.sectionRepository.findOne({
      where: { id: sectionId, institution: { prefix: institutionPrefix } },
      relations: ['institution'],
    });

    if (!sectionEntity) {
      throw new NotFoundException('Section not found in your institution');
    }

    return sectionEntity;
  }

  private async getCourseInInstitution(
    courseId: number,
    institutionPrefix: string,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, institution: { prefix: institutionPrefix } },
      relations: ['institution'],
    });

    if (!course) {
      throw new NotFoundException('Course not found in your institution');
    }

    return course;
  }

  private async getTeacherInInstitution(
    teacherId: number,
    institutionPrefix: string,
  ) {
    const teacher = await this.authRepository.findOne({
      where: {
        id: teacherId,
        role: UserRoles.TEACHER,
        institution: { prefix: institutionPrefix },
      },
    });

    if (!teacher) {
      throw new NotFoundException(
        'Teacher not found or does not belong to your institution',
      );
    }

    return teacher;
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
      throw new ConflictException(
        'Only students can be enrolled in section offerings',
      );
    }

    return studentProfiles;
  }

  private buildOfferingResponse(offering: SectionOfferingEntity) {
    return {
      id: offering.id,
      sectionId: offering.section?.id,
      sectionName: offering.section?.name,
      courseId: offering.course?.id,
      courseCode: offering.course?.code,
      courseTitle: offering.course?.title,
      teacherId: offering.teacher?.id,
      teacherName: offering.teacher?.name,
      teacherUsername: offering.teacher?.username,
      institutionPrefix: offering.section?.institution?.prefix,
      isActive: offering.isActive,
      studentProfileIds: offering.students?.map((student) => student.id) || [],
      studentIds:
        offering.students?.map((student) => student.student?.id) || [],
      createdAt: offering.createdAt,
      updatedAt: offering.updatedAt,
    };
  }
}
