import {
  ForbiddenException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthEntity,
  AssignmentEntity,
  AssignmentSubmissionEntity,
  AttendanceEntity,
  CourseEntity,
  QuizAttemptEntity,
  QuizEntity,
  SectionEntity,
  SectionOfferingEntity,
  StudentGroupEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import { AttendanceStatus } from 'src/database/entities/attendance.entity';
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

interface SectionOfferingSummary {
  id: number;
  sectionId?: number;
  sectionName?: string;
  courseId?: number;
  courseCode?: string;
  courseTitle?: string;
  teacherId?: number;
  teacherName?: string;
  teacherUsername?: string;
  institutionPrefix?: string;
  isActive: boolean;
  studentProfileIds: number[];
  studentIds: number[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface StudentDashboardCourseSummary extends SectionOfferingSummary {
  pendingAssignments: number;
  pendingQuizzes: number;
  attendancePercentage: number;
}

interface StudentDashboardSummaryResponse {
  activeCourses: StudentDashboardCourseSummary[];
  previousCourses: SectionOfferingSummary[];
}

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
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(AssignmentSubmissionEntity)
    private readonly assignmentSubmissionRepository: Repository<AssignmentSubmissionEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly quizAttemptRepository: Repository<QuizAttemptEntity>,
    @InjectRepository(AttendanceEntity)
    private readonly attendanceRepository: Repository<AttendanceEntity>,
    private readonly institutionContextService: InstitutionContextService,
  ) {}

  async getStudentDashboardSummary(
    user: UserData,
  ): Promise<StudentDashboardSummaryResponse> {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: { student: { id: user.authId, role: UserRoles.STUDENT } },
      relations: ['student', 'sectionOfferings'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    const offeringIds = (studentProfile.sectionOfferings || []).map(
      (offering) => offering.id,
    );

    if (offeringIds.length === 0) {
      return {
        activeCourses: [],
        previousCourses: [],
      };
    }

    const offerings = await this.sectionOfferingRepository.find({
      where: { id: In(offeringIds) },
      relations: ['section', 'section.institution', 'course', 'teacher'],
      order: { createdAt: 'DESC' },
    });

    const activeOfferings = offerings.filter((offering) => offering.isActive);
    const previousOfferings = offerings.filter(
      (offering) => !offering.isActive,
    );

    const activeCourses = await Promise.all(
      activeOfferings.map((offering) =>
        this.buildDashboardCourseSummary(offering, studentProfile.id),
      ),
    );

    return {
      activeCourses,
      previousCourses: previousOfferings.map((offering) =>
        this.buildOfferingResponse(offering),
      ),
    };
  }

  async createSectionOffering(
    createSectionOfferingDto: CreateSectionOfferingDto,
    user: UserData,
  ) {
    const managerInstitution =
      await this.institutionContextService.getManagerInstitution(user);

    const sectionEntity = await this.getSectionInInstitution(
      createSectionOfferingDto.sectionId,
      managerInstitution.id,
    );
    const course = await this.getCourseInInstitution(
      createSectionOfferingDto.courseId,
      managerInstitution.id,
    );
    const teacher = await this.getTeacherInInstitution(
      createSectionOfferingDto.teacherId,
      managerInstitution.id,
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
      managerInstitution.id,
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
    let institutionPrefix: number;
    const isTeacher = user.role === UserRoles.TEACHER;
    const isStudent = user.role === UserRoles.STUDENT;

    if (isTeacher) {
      const teacherAuth = await this.authRepository.findOne({
        where: { id: user.authId, role: UserRoles.TEACHER },
        relations: ['institution'],
      });

      if (!teacherAuth) {
        throw new NotFoundException('Teacher account not found');
      }

      if (!teacherAuth.institution?.id) {
        throw new ForbiddenException(
          'Teacher account is not linked to an institution',
        );
      }

      institutionPrefix = teacherAuth.institution.id;
    } else if (isStudent) {
      const studentProfile = await this.studentProfileRepository.findOne({
        where: {
          student: { id: user.authId, role: UserRoles.STUDENT },
        },
        relations: ['student', 'institution'],
      });

      if (!studentProfile) {
        throw new NotFoundException('Student profile not found');
      }

      if (!studentProfile.institution?.id) {
        throw new ForbiddenException(
          'Student profile is not linked to an institution',
        );
      }

      institutionPrefix = studentProfile.institution.id;
    } else {
      const managerInstitution =
        await this.institutionContextService.getManagerInstitution(user);
      institutionPrefix = managerInstitution.id;
    }

    const { page, size, filters } = listFiltersDto;
    const skip = (page - 1) * size;

    const where: Record<string, unknown> = {
      section: { institution: { id: institutionPrefix } },
    };

    if (isTeacher) {
      where.teacher = { id: user.authId };
    }

    if (isStudent) {
      const studentProfile = await this.studentProfileRepository.findOne({
        where: {
          student: { id: user.authId, role: UserRoles.STUDENT },
        },
        relations: ['student'],
      });

      if (!studentProfile) {
        throw new NotFoundException('Student profile not found');
      }

      where.students = { id: studentProfile.id };
    }

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

      if (!isTeacher && !isStudent && typedFilters.teacherId !== undefined) {
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
        section: { institution: { id: managerInstitution.id } },
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
        managerInstitution.id,
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
        managerInstitution.id,
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
        managerInstitution.id,
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
        section: { institution: { id: managerInstitution.id } },
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
    institutionId: number,
  ) {
    const sectionEntity = await this.sectionRepository.findOne({
      where: { id: sectionId, institution: { id: institutionId } },
      relations: ['institution'],
    });

    if (!sectionEntity) {
      throw new NotFoundException('Section not found in your institution');
    }

    return sectionEntity;
  }

  private async getCourseInInstitution(
    courseId: number,
    institutionId: number,
  ) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId, institution: { id: institutionId } },
      relations: ['institution'],
    });

    if (!course) {
      throw new NotFoundException('Course not found in your institution');
    }

    return course;
  }

  private async getTeacherInInstitution(
    teacherId: number,
    institutionId: number,
  ) {
    const teacher = await this.authRepository.findOne({
      where: {
        id: teacherId,
        role: UserRoles.TEACHER,
        institution: { id: institutionId },
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
    institutionId: number,
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
          institution: { id: institutionId },
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
        institution: { id: institutionId },
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

  private async buildDashboardCourseSummary(
    offering: SectionOfferingEntity,
    studentProfileId: number,
  ): Promise<StudentDashboardCourseSummary> {
    const [assignments, quizzes, attendanceRows] = await Promise.all([
      this.assignmentRepository.find({
        where: { sectionOffering: { id: offering.id }, isActive: true },
      }),
      this.quizRepository.find({
        where: { sectionOffering: { id: offering.id }, isActive: true },
      }),
      this.attendanceRepository.find({
        where: {
          sectionOffering: { id: offering.id },
          studentProfile: { id: studentProfileId },
        },
        select: ['status'],
      }),
    ]);

    const assignmentIds = assignments.map((assignment) => assignment.id);
    const quizIds = quizzes.map((quiz) => quiz.id);

    const [submissions, attempts] = await Promise.all([
      assignmentIds.length > 0
        ? this.assignmentSubmissionRepository.find({
            where: {
              assignment: { id: In(assignmentIds) },
              studentProfile: { id: studentProfileId },
            },
            relations: ['assignment'],
          })
        : Promise.resolve([]),
      quizIds.length > 0
        ? this.quizAttemptRepository.find({
            where: {
              quiz: { id: In(quizIds) },
              studentProfile: { id: studentProfileId },
            },
            relations: ['quiz'],
          })
        : Promise.resolve([]),
    ]);

    const submittedAssignmentIds = new Set(
      submissions
        .map((submission) => submission.assignment?.id)
        .filter((value): value is number => typeof value === 'number'),
    );

    const attemptsByQuizId = new Map<number, number>();
    for (const attempt of attempts) {
      const quizId = attempt.quiz?.id;
      if (!quizId) {
        continue;
      }

      attemptsByQuizId.set(quizId, (attemptsByQuizId.get(quizId) || 0) + 1);
    }

    const now = new Date();
    const pendingQuizzes = quizzes.filter((quiz) => {
      const attemptsUsed = attemptsByQuizId.get(quiz.id) || 0;
      return (
        now >= quiz.startsAt &&
        now <= quiz.endsAt &&
        attemptsUsed < quiz.maxAttempts
      );
    }).length;

    const presentCount = attendanceRows.filter(
      (row) => row.status === AttendanceStatus.PRESENT,
    ).length;
    const totalMarked = attendanceRows.length;
    const attendancePercentage =
      totalMarked > 0
        ? Number(((presentCount / totalMarked) * 100).toFixed(2))
        : 0;

    return {
      ...this.buildOfferingResponse(offering),
      pendingAssignments: assignments.length - submittedAssignmentIds.size,
      pendingQuizzes,
      attendancePercentage,
    };
  }
}
