import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignmentEntity,
  CustomGradeEntity,
  GradeEntity,
  GradeTypes,
  QuizEntity,
  SectionOfferingEntity,
  StudentProfileEntity,
  AuthEntity,
} from 'src/database/entities';
import type { UserData } from 'src/shared/types';
import { In, Repository } from 'typeorm';
import {
  CreateCustomGradeDto,
  CreateCustomGradesDto,
  DeleteTeacherGradeDto,
  TeacherGradebookDto,
  TeacherStudentGradesDto,
  UpdateTeacherGradeDto,
} from './dtos';

type GradeView = {
  gradeId: number | null;
  gradeType: string;
  assessmentId: number | null;
  title: string;
  score: number | null;
  maxGrade: number | null;
  percentage: number | null;
  feedback: string | null;
  gradedAt: Date | null;
  editable: boolean;
  isGraded: boolean;
};

@Injectable()
export class TeacherGradebookService {
  constructor(
    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
    @InjectRepository(CustomGradeEntity)
    private readonly customGradeRepository: Repository<CustomGradeEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
  ) {}

  async getTeacherGradebook(dto: TeacherGradebookDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(dto.offeringId, user);

    const students = offering.students || [];
    const studentIds = students.map((student) => student.id);

    const [assignments, quizzes] = await Promise.all([
      this.assignmentRepository.find({
        where: { sectionOffering: { id: offering.id } },
      }),
      this.quizRepository.find({
        where: { sectionOffering: { id: offering.id } },
      }),
    ]);

    const [grades, customDefinitions] = await Promise.all([
      studentIds.length
        ? this.gradeRepository.find({
            where: {
              sectionOffering: { id: offering.id },
              studentProfile: { id: In(studentIds) },
            },
            relations: ['studentProfile', 'studentProfile.student'],
            order: { updatedAt: 'DESC' },
          })
        : Promise.resolve([]),
      this.customGradeRepository.find({
        where: {
          sectionOffering: { id: offering.id },
        },
        order: { updatedAt: 'DESC' },
      }),
    ]);

    const assignmentById = new Map<number, AssignmentEntity>();
    for (const assignment of assignments)
      assignmentById.set(assignment.id, assignment);

    const quizById = new Map<number, QuizEntity>();
    for (const quiz of quizzes) quizById.set(quiz.id, quiz);
    const customDefinitionById = new Map<number, CustomGradeEntity>();
    for (const customDefinition of customDefinitions) {
      customDefinitionById.set(customDefinition.id, customDefinition);
    }
    const totalAssessments =
      assignments.length + quizzes.length + customDefinitions.length;

    const gradesByStudent = new Map<number, GradeView[]>();
    for (const grade of grades) {
      const studentId = grade.studentProfile?.id;
      if (!studentId) continue;
      const current = gradesByStudent.get(studentId) || [];
      current.push(
        this.mapGradeView(
          grade,
          assignmentById,
          quizById,
          customDefinitionById,
        ),
      );
      gradesByStudent.set(studentId, current);
    }

    return {
      offering: {
        id: offering.id,
        sectionName: offering.section?.name ?? null,
        courseName: offering.course?.title ?? null,
      },
      data: students.map((student) => {
        const studentGrades = gradesByStudent.get(student.id) || [];
        const percentages = studentGrades
          .map((grade) => grade.percentage)
          .filter((value): value is number => value !== null);
        const percentage = percentages.length
          ? Number(
              (
                percentages.reduce((sum, value) => sum + value, 0) /
                percentages.length
              ).toFixed(2),
            )
          : null;
        const gradedCount = studentGrades.length;

        return {
          studentProfileId: student.id,
          studentId: student.student?.id ?? null,
          studentName: student.student?.name ?? 'Student',
          rollNo: student.rollNo,
          percentage,
          gradeCount: gradedCount,
          gradedCount,
          pendingCount: Math.max(totalAssessments - gradedCount, 0),
          assignmentCount: studentGrades.filter(
            (grade) => grade.gradeType === GradeTypes.ASSIGNMENT,
          ).length,
          quizCount: studentGrades.filter(
            (grade) => grade.gradeType === GradeTypes.QUIZ,
          ).length,
          customCount: studentGrades.filter(
            (grade) => grade.gradeType === GradeTypes.CUSTOM,
          ).length,
        };
      }),
    };
  }

  async getTeacherStudentGrades(dto: TeacherStudentGradesDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(dto.offeringId, user);
    const studentProfile = await this.getStudentProfileInOffering(
      dto.studentProfileId,
      offering.id,
    );

    const [assignments, quizzes, grades, customDefinitions] = await Promise.all(
      [
        this.assignmentRepository.find({
          where: { sectionOffering: { id: offering.id } },
        }),
        this.quizRepository.find({
          where: { sectionOffering: { id: offering.id } },
        }),
        this.gradeRepository.find({
          where: {
            sectionOffering: { id: offering.id },
            studentProfile: { id: studentProfile.id },
          },
          relations: ['studentProfile', 'gradedByTeacher'],
          order: { updatedAt: 'DESC' },
        }),
        this.customGradeRepository.find({
          where: {
            sectionOffering: { id: offering.id },
          },
          order: { updatedAt: 'DESC' },
        }),
      ],
    );

    const assignmentById = new Map<number, AssignmentEntity>();
    for (const assignment of assignments)
      assignmentById.set(assignment.id, assignment);

    const quizById = new Map<number, QuizEntity>();
    for (const quiz of quizzes) quizById.set(quiz.id, quiz);

    const customDefinitionById = new Map<number, CustomGradeEntity>();
    for (const customDefinition of customDefinitions) {
      customDefinitionById.set(customDefinition.id, customDefinition);
    }

    const assignmentGradeByAssessmentId = new Map<number, GradeEntity>();
    const quizGradeByAssessmentId = new Map<number, GradeEntity>();
    const customGradeByAssessmentId = new Map<number, GradeEntity>();
    for (const grade of grades) {
      if (!grade.assessmentId) continue;
      if (grade.gradeType === GradeTypes.ASSIGNMENT) {
        assignmentGradeByAssessmentId.set(grade.assessmentId, grade);
      }
      if (grade.gradeType === GradeTypes.QUIZ) {
        quizGradeByAssessmentId.set(grade.assessmentId, grade);
      }
      if (grade.gradeType === GradeTypes.CUSTOM) {
        customGradeByAssessmentId.set(grade.assessmentId, grade);
      }
    }

    const items: GradeView[] = [
      ...assignments.map((assignment) => {
        const grade = assignmentGradeByAssessmentId.get(assignment.id);
        if (grade) {
          return this.mapGradeView(
            grade,
            assignmentById,
            quizById,
            customDefinitionById,
          );
        }
        return this.mapPendingGradeView(
          GradeTypes.ASSIGNMENT,
          assignment.id,
          assignment.title,
          Number(assignment.maxGrade),
        );
      }),
      ...quizzes.map((quiz) => {
        const grade = quizGradeByAssessmentId.get(quiz.id);
        if (grade) {
          return this.mapGradeView(
            grade,
            assignmentById,
            quizById,
            customDefinitionById,
          );
        }
        return this.mapPendingGradeView(
          GradeTypes.QUIZ,
          quiz.id,
          quiz.title,
          quiz.questions.length,
        );
      }),
      ...customDefinitions.map((definition) => {
        const grade = customGradeByAssessmentId.get(definition.id);
        if (grade) {
          return this.mapGradeView(
            grade,
            assignmentById,
            quizById,
            customDefinitionById,
          );
        }
        return this.mapPendingGradeView(
          GradeTypes.CUSTOM,
          definition.id,
          definition.title,
          Number(definition.maxGrade),
        );
      }),
    ];
    items.sort((a, b) => {
      if (a.gradeType !== b.gradeType) {
        return a.gradeType.localeCompare(b.gradeType);
      }
      return a.title.localeCompare(b.title);
    });

    const percentages = items
      .filter((grade) => grade.isGraded)
      .map((grade) => grade.percentage)
      .filter((value): value is number => value !== null);
    const gradedItems = items.filter((grade) => grade.isGraded);

    return {
      offering: {
        id: offering.id,
        sectionName: offering.section?.name ?? null,
        courseName: offering.course?.title ?? null,
      },
      student: {
        studentProfileId: studentProfile.id,
        studentId: studentProfile.student?.id ?? null,
        studentName: studentProfile.student?.name ?? 'Student',
        rollNo: studentProfile.rollNo,
      },
      summary: {
        totalGrades: gradedItems.length,
        pendingGrades: items.length - gradedItems.length,
        assessmentCount: items.length,
        averagePercentage: percentages.length
          ? Number(
              (
                percentages.reduce((sum, value) => sum + value, 0) /
                percentages.length
              ).toFixed(2),
            )
          : null,
        averagesByType: {
          assignment: this.typeAverage(items, 'assignment'),
          quiz: this.typeAverage(items, 'quiz'),
          custom: this.typeAverage(items, 'custom'),
        },
      },
      data: items,
    };
  }

  async upsertCustomGrade(dto: CreateCustomGradeDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(dto.offeringId, user);
    const studentProfile = await this.getStudentProfileInOffering(
      dto.studentProfileId,
      offering.id,
    );

    const customGrade = await this.customGradeRepository.findOne({
      where: {
        id: dto.customGradeId,
        sectionOffering: { id: offering.id },
      },
      relations: ['sectionOffering'],
    });

    if (!customGrade) {
      throw new NotFoundException('Custom grade not found for this teacher');
    }

    if (dto.score < 0) {
      throw new BadRequestException('Score must be non-negative');
    }

    if (dto.score > Number(customGrade.maxGrade)) {
      throw new BadRequestException(
        `Score cannot exceed maxGrade (${customGrade.maxGrade})`,
      );
    }

    const existing = await this.gradeRepository.findOne({
      where: {
        gradeType: GradeTypes.CUSTOM,
        assessmentId: customGrade.id,
        sectionOffering: { id: offering.id },
        studentProfile: { id: studentProfile.id },
      },
      relations: ['studentProfile', 'sectionOffering', 'gradedByTeacher'],
    });

    const grade = existing
      ? Object.assign(existing, {
          score: dto.score,
          feedback: dto.feedback,
          gradedByTeacher: { id: user.authId } as AuthEntity,
        })
      : this.gradeRepository.create({
          gradeType: GradeTypes.CUSTOM,
          assessmentId: customGrade.id,
          score: dto.score,
          feedback: dto.feedback,
          studentProfile: { id: studentProfile.id },
          sectionOffering: { id: offering.id },
          gradedByTeacher: { id: user.authId } as AuthEntity,
        });

    const savedGrade = await this.gradeRepository.save(grade);

    return this.mapSavedCustomGrade(
      savedGrade,
      offering.id,
      studentProfile,
      customGrade,
    );
  }

  async createCustomGrades(dto: CreateCustomGradesDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(dto.offeringId, user);

    if (!dto.grades.length) {
      throw new BadRequestException('At least one student grade is required');
    }

    const students = offering.students || [];
    const studentById = new Map(
      students.map((student) => [student.id, student]),
    );
    const seenStudentIds = new Set<number>();

    for (const gradeEntry of dto.grades) {
      if (seenStudentIds.has(gradeEntry.studentProfileId)) {
        throw new BadRequestException(
          'Each student can only appear once in the custom grade list',
        );
      }
      seenStudentIds.add(gradeEntry.studentProfileId);

      if (!studentById.has(gradeEntry.studentProfileId)) {
        throw new BadRequestException(
          `Student profile ${gradeEntry.studentProfileId} is not enrolled in this offering`,
        );
      }
      if (gradeEntry.score > dto.maxGrade) {
        throw new BadRequestException(
          `Score cannot exceed maxGrade (${dto.maxGrade})`,
        );
      }
    }

    const customGrade = this.customGradeRepository.create({
      title: dto.title,
      maxGrade: dto.maxGrade,
      sectionOffering: { id: offering.id },
    });
    const savedCustomGrade = await this.customGradeRepository.save(customGrade);

    const studentProfiles = await this.studentProfileRepository.find({
      where: { id: In(Array.from(seenStudentIds)) },
      relations: ['student'],
    });
    const profileById = new Map(
      studentProfiles.map((studentProfile) => [
        studentProfile.id,
        studentProfile,
      ]),
    );

    const grades = dto.grades.map((gradeEntry) => {
      const studentProfile = profileById.get(gradeEntry.studentProfileId);
      if (!studentProfile) {
        throw new NotFoundException(
          `Student profile ${gradeEntry.studentProfileId} could not be loaded`,
        );
      }

      return this.gradeRepository.create({
        gradeType: GradeTypes.CUSTOM,
        assessmentId: savedCustomGrade.id,
        score: gradeEntry.score,
        feedback: gradeEntry.feedback,
        studentProfile: { id: studentProfile.id },
        sectionOffering: { id: offering.id },
        gradedByTeacher: { id: user.authId } as AuthEntity,
      });
    });

    const savedGrades = await this.gradeRepository.save(grades);

    return {
      title: dto.title,
      maxGrade: dto.maxGrade,
      customGradeId: savedCustomGrade.id,
      createdCount: savedGrades.length,
    };
  }

  async updateTeacherGrade(dto: UpdateTeacherGradeDto, user: UserData) {
    const grade = await this.gradeRepository.findOne({
      where: {
        id: dto.gradeId,
        sectionOffering: { teacher: { id: user.authId } },
      },
      relations: [
        'studentProfile',
        'sectionOffering',
        'sectionOffering.section',
        'sectionOffering.course',
        'gradedByTeacher',
      ],
    });

    if (!grade) {
      throw new NotFoundException('Grade not found for this teacher');
    }

    if (dto.score < 0) {
      throw new BadRequestException('Score must be non-negative');
    }

    if (grade.gradeType === GradeTypes.ASSIGNMENT) {
      const assignment = await this.assignmentRepository.findOne({
        where: { id: grade.assessmentId || 0 },
      });

      if (!assignment) {
        throw new NotFoundException('Assignment not found for this grade');
      }

      if (dto.score > Number(assignment.maxGrade)) {
        throw new BadRequestException(
          `Score cannot exceed maxGrade (${assignment.maxGrade})`,
        );
      }
    }

    if (grade.gradeType === GradeTypes.QUIZ) {
      const quiz = await this.quizRepository.findOne({
        where: { id: grade.assessmentId || 0 },
      });

      if (!quiz) {
        throw new NotFoundException('Quiz not found for this grade');
      }

      if (dto.score > quiz.questions.length) {
        throw new BadRequestException(
          `Score cannot exceed maxGrade (${quiz.questions.length})`,
        );
      }
    }

    if (grade.gradeType === GradeTypes.CUSTOM) {
      const customGrade = await this.customGradeRepository.findOne({
        where: { id: grade.assessmentId || 0 },
      });

      if (!customGrade) {
        throw new NotFoundException('Custom grade not found for this grade');
      }

      if (dto.score > Number(customGrade.maxGrade)) {
        throw new BadRequestException(
          `Score cannot exceed maxGrade (${customGrade.maxGrade})`,
        );
      }

      grade.score = dto.score;
      if (dto.feedback !== undefined) {
        grade.feedback = dto.feedback;
      }
      grade.gradedByTeacher = { id: user.authId } as AuthEntity;

      const savedGrade = await this.gradeRepository.save(grade);
      return this.mapSavedCustomGrade(
        savedGrade,
        savedGrade.sectionOffering.id,
        savedGrade.studentProfile,
        customGrade,
      );
    }

    grade.score = dto.score;
    if (dto.feedback !== undefined) {
      grade.feedback = dto.feedback;
    }
    grade.gradedByTeacher = { id: user.authId } as AuthEntity;

    const savedGrade = await this.gradeRepository.save(grade);
    return this.mapSavedGrade(
      savedGrade,
      savedGrade.sectionOffering.id,
      savedGrade.studentProfile,
    );
  }

  async updateCustomGrade(dto: UpdateTeacherGradeDto, user: UserData) {
    return this.updateTeacherGrade(dto, user);
  }

  async deleteTeacherGrade(dto: DeleteTeacherGradeDto, user: UserData) {
    const grade = await this.gradeRepository.findOne({
      where: {
        id: dto.gradeId,
        gradeType: GradeTypes.CUSTOM,
        sectionOffering: { teacher: { id: user.authId } },
      },
      relations: ['studentProfile', 'sectionOffering'],
    });

    if (!grade) {
      throw new NotFoundException('Custom grade not found for this teacher');
    }

    await this.gradeRepository.remove(grade);

    return {
      message: 'Custom grade deleted successfully',
      gradeId: dto.gradeId,
      studentProfileId: grade.studentProfile?.id ?? null,
      offeringId: grade.sectionOffering?.id ?? null,
    };
  }

  private async getTeacherOwnedOffering(offeringId: number, user: UserData) {
    const offering = await this.sectionOfferingRepository.findOne({
      where: {
        id: offeringId,
        teacher: { id: user.authId },
      },
      relations: [
        'teacher',
        'section',
        'course',
        'students',
        'students.student',
      ],
    });

    if (!offering) {
      throw new NotFoundException(
        'Section offering not found for this teacher',
      );
    }

    return offering;
  }

  private async getStudentProfileInOffering(
    studentProfileId: number,
    offeringId: number,
  ) {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: {
        id: studentProfileId,
        sectionOfferings: { id: offeringId },
      },
      relations: ['student', 'sectionOfferings'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student is not enrolled in this offering');
    }

    return studentProfile;
  }

  private resolvePercentage(
    grade: GradeEntity,
    assignmentById: Map<number, AssignmentEntity>,
    quizById: Map<number, QuizEntity>,
    customDefinitionById: Map<number, CustomGradeEntity>,
  ) {
    if (!grade.assessmentId || grade.assessmentId <= 0) {
      return null;
    }

    if (grade.gradeType === GradeTypes.ASSIGNMENT) {
      const assignment = assignmentById.get(grade.assessmentId);
      if (!assignment || Number(assignment.maxGrade) <= 0) return null;
      return Number(
        ((Number(grade.score) / Number(assignment.maxGrade)) * 100).toFixed(2),
      );
    }

    if (grade.gradeType === GradeTypes.QUIZ) {
      const quiz = quizById.get(grade.assessmentId);
      if (!quiz || quiz.questions.length <= 0) return null;
      return Number(
        ((Number(grade.score) / quiz.questions.length) * 100).toFixed(2),
      );
    }

    if (grade.gradeType === GradeTypes.CUSTOM) {
      const customGrade = customDefinitionById.get(grade.assessmentId);
      if (!customGrade || Number(customGrade.maxGrade) <= 0) return null;
      return Number(
        ((Number(grade.score) / Number(customGrade.maxGrade)) * 100).toFixed(2),
      );
    }

    return null;
  }

  private mapGradeView(
    grade: GradeEntity,
    assignmentById: Map<number, AssignmentEntity>,
    quizById: Map<number, QuizEntity>,
    customDefinitionById: Map<number, CustomGradeEntity>,
  ): GradeView {
    const percentage = this.resolvePercentage(
      grade,
      assignmentById,
      quizById,
      customDefinitionById,
    );

    if (grade.gradeType === GradeTypes.ASSIGNMENT) {
      const assignment = grade.assessmentId
        ? assignmentById.get(grade.assessmentId)
        : null;
      return {
        gradeId: grade.id,
        gradeType: grade.gradeType,
        assessmentId: grade.assessmentId ?? null,
        title: assignment?.title ?? 'Assignment',
        score: Number(grade.score),
        maxGrade: assignment ? Number(assignment.maxGrade) : null,
        percentage,
        feedback: grade.feedback ?? null,
        gradedAt: grade.updatedAt,
        editable: true,
        isGraded: true,
      };
    }

    if (grade.gradeType === GradeTypes.QUIZ) {
      const quiz = grade.assessmentId ? quizById.get(grade.assessmentId) : null;
      return {
        gradeId: grade.id,
        gradeType: grade.gradeType,
        assessmentId: grade.assessmentId ?? null,
        title: quiz?.title ?? 'Quiz',
        score: Number(grade.score),
        maxGrade: quiz ? quiz.questions.length : null,
        percentage,
        feedback: grade.feedback ?? null,
        gradedAt: grade.updatedAt,
        editable: true,
        isGraded: true,
      };
    }

    if (grade.gradeType === GradeTypes.CUSTOM) {
      const customGrade = grade.assessmentId
        ? customDefinitionById.get(grade.assessmentId)
        : null;
      const maxGrade = customGrade ? Number(customGrade.maxGrade) : null;
      return {
        gradeId: grade.id,
        gradeType: grade.gradeType,
        assessmentId: grade.assessmentId ?? null,
        title: customGrade?.title ?? 'Custom Grade',
        score: Number(grade.score),
        maxGrade,
        percentage,
        feedback: grade.feedback ?? null,
        gradedAt: grade.updatedAt,
        editable: true,
        isGraded: true,
      };
    }

    return {
      gradeId: grade.id,
      gradeType: grade.gradeType,
      assessmentId: grade.assessmentId ?? null,
      title: 'Grade',
      score: Number(grade.score),
      maxGrade: null,
      percentage,
      feedback: grade.feedback ?? null,
      gradedAt: grade.updatedAt,
      editable: true,
      isGraded: true,
    };
  }

  private typeAverage(
    items: GradeView[],
    type: 'assignment' | 'quiz' | 'custom',
  ) {
    const values = items
      .filter((item) => item.isGraded)
      .filter((item) => item.gradeType === type)
      .map((item) => item.percentage)
      .filter((value): value is number => value !== null);
    return values.length
      ? Number(
          (
            values.reduce((sum, value) => sum + value, 0) / values.length
          ).toFixed(2),
        )
      : null;
  }

  private mapPendingGradeView(
    gradeType: GradeTypes[keyof typeof GradeTypes],
    assessmentId: number | null,
    title: string,
    maxGrade: number | null,
  ): GradeView {
    return {
      gradeId: null,
      gradeType,
      assessmentId,
      title,
      score: null,
      maxGrade,
      percentage: null,
      feedback: null,
      gradedAt: null,
      editable: true,
      isGraded: false,
    };
  }

  private async mapSavedGrade(
    grade: GradeEntity,
    offeringId: number,
    studentProfile: StudentProfileEntity,
  ) {
    return {
      gradeId: grade.id,
      gradeType: grade.gradeType,
      assessmentId: grade.assessmentId ?? null,
      offeringId,
      studentProfileId: studentProfile.id,
      studentId: studentProfile.student?.id ?? null,
      studentName: studentProfile.student?.name ?? 'Student',
      score: Number(grade.score),
      maxGrade: null,
      percentage:
        grade.gradeType === GradeTypes.CUSTOM ? Number(grade.score) : null,
      feedback: grade.feedback ?? null,
      gradedAt: grade.updatedAt,
    };
  }

  private async mapSavedCustomGrade(
    grade: GradeEntity,
    offeringId: number,
    studentProfile: StudentProfileEntity,
    customGrade: CustomGradeEntity,
  ) {
    const maxGrade = Number(customGrade.maxGrade);
    return {
      gradeId: grade.id,
      gradeType: GradeTypes.CUSTOM,
      assessmentId: grade.assessmentId ?? null,
      offeringId,
      studentProfileId: studentProfile.id,
      studentId: studentProfile.student?.id ?? null,
      studentName: studentProfile.student?.name ?? 'Student',
      title: customGrade.title,
      score: Number(grade.score),
      maxGrade,
      percentage:
        maxGrade > 0
          ? Number(((Number(grade.score) / maxGrade) * 100).toFixed(2))
          : null,
      feedback: grade.feedback ?? null,
      gradedAt: grade.updatedAt,
    };
  }
}
