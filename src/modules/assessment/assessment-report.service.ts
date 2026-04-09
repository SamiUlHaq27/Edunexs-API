import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AssignmentEntity,
  GradeEntity,
  GradeTypes,
  QuizEntity,
  SectionOfferingEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import type { UserData } from 'src/shared/types';
import { In, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { ListStudentGradeReportDto } from './dtos';

@Injectable()
export class AssessmentReportService {
  constructor(
    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
  ) {}

  private async getStudentProfileForUser(user: UserData) {
    if (user.role === 'student') {
      const profile = await this.studentProfileRepository.findOne({
        where: { student: { id: user.authId } },
        relations: ['student', 'sectionOfferings', 'institution'],
      });

      if (!profile) {
        throw new NotFoundException('Student profile not found');
      }

      return profile;
    }

    if (user.role === 'parent') {
      if (!user.studentProfileId) {
        throw new ForbiddenException('Parent is not linked to any student');
      }

      const profile = await this.studentProfileRepository.findOne({
        where: { id: user.studentProfileId },
        relations: ['student', 'sectionOfferings', 'institution'],
      });

      if (!profile) {
        throw new NotFoundException('Student profile not found for parent');
      }

      return profile;
    }

    throw new ForbiddenException('Only students or parents can view reports');
  }

  async getStudentGradeReport(
    listDto: ListStudentGradeReportDto,
    user: UserData,
  ) {
    const studentProfile = await this.getStudentProfileForUser(user);

    const { page, size, offeringId, assessmentType } = listDto;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<GradeEntity> = {
      studentProfile: { id: studentProfile.id },
    };

    if (offeringId) {
      where.sectionOffering = { id: offeringId };
    }

    if (assessmentType) {
      if (assessmentType === 'assignment') {
        where.gradeType = GradeTypes.ASSIGNMENT;
      } else if (assessmentType === 'quiz') {
        where.gradeType = GradeTypes.QUIZ;
      } else if (assessmentType === 'exam') {
        where.gradeType = GradeTypes.EXAM;
      }
    }

    const [grades, total] = await this.gradeRepository.findAndCount({
      where,
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
        'gradedByTeacher',
      ],
      order: { updatedAt: 'DESC' },
      skip,
      take: size,
    });

    if (total === 0) {
      return {
        student: {
          studentProfileId: studentProfile.id,
          studentId: studentProfile.student?.id,
          studentName: studentProfile.student?.name,
          rollNo: studentProfile.rollNo,
        },
        summary: {
          totalAssessments: 0,
          gradedAssessments: 0,
          averagesByType: {
            assignment: null,
            quiz: null,
            exam: null,
          },
          overallPercentage: null,
        },
        data: [],
        total,
        page,
        size,
        totalPages: 0,
      };
    }

    const assignmentIds = new Set<number>();
    const quizIds = new Set<number>();

    for (const grade of grades) {
      if (!grade.assessmentId) continue;
      if (grade.gradeType === GradeTypes.ASSIGNMENT) {
        assignmentIds.add(grade.assessmentId);
      } else if (grade.gradeType === GradeTypes.QUIZ) {
        quizIds.add(grade.assessmentId);
      }
    }

    const [assignments, quizzes] = await Promise.all([
      assignmentIds.size
        ? this.assignmentRepository.find({
            where: { id: In(Array.from(assignmentIds)) },
            relations: [
              'sectionOffering',
              'sectionOffering.course',
              'sectionOffering.section',
            ],
          })
        : Promise.resolve([]),
      quizIds.size
        ? this.quizRepository.find({
            where: { id: In(Array.from(quizIds)) },
            relations: [
              'sectionOffering',
              'sectionOffering.course',
              'sectionOffering.section',
            ],
          })
        : Promise.resolve([]),
    ]);

    const assignmentById = new Map<number, AssignmentEntity>();
    for (const a of assignments) {
      assignmentById.set(a.id, a);
    }

    const quizById = new Map<number, QuizEntity>();
    for (const q of quizzes) {
      quizById.set(q.id, q);
    }

    const items: Array<{
      gradeId: number;
      gradeType: string;
      assessmentId: number | null;
      title: string | null;
      maxGrade: number | null;
      score: number;
      percentage: number | null;
      feedback: string | null;
      gradedAt: Date;
      offering: {
        id: number | null;
        sectionName: string | null;
        courseName: string | null;
      };
    }> = [];

    const perTypeAccum: Record<
      string,
      { totalPercentage: number; count: number }
    > = {
      assignment: { totalPercentage: 0, count: 0 },
      quiz: { totalPercentage: 0, count: 0 },
      exam: { totalPercentage: 0, count: 0 },
    };

    for (const grade of grades) {
      let title: string | null = null;
      let maxGrade: number | null = null;
      let sectionName: string | null = null;
      let courseName: string | null = null;
      let offeringId: number | null = grade.sectionOffering?.id ?? null;

      if (grade.gradeType === GradeTypes.ASSIGNMENT && grade.assessmentId) {
        const assignment = assignmentById.get(grade.assessmentId);
        if (assignment) {
          title = assignment.title;
          maxGrade = Number(assignment.maxGrade);
          offeringId = assignment.sectionOffering?.id ?? offeringId;
          sectionName = assignment.sectionOffering?.section?.name ?? null;
          courseName = assignment.sectionOffering?.course?.title ?? null;
        }
      } else if (grade.gradeType === GradeTypes.QUIZ && grade.assessmentId) {
        const quiz = quizById.get(grade.assessmentId);
        if (quiz) {
          title = quiz.title;
          maxGrade = quiz.questions?.length ?? null;
          offeringId = quiz.sectionOffering?.id ?? offeringId;
          sectionName = quiz.sectionOffering?.section?.name ?? null;
          courseName = quiz.sectionOffering?.course?.title ?? null;
        }
      }

      if (!sectionName || !courseName) {
        sectionName = grade.sectionOffering?.section?.name ?? sectionName;
        courseName = grade.sectionOffering?.course?.title ?? courseName;
      }

      const score = Number(grade.score);
      let percentage: number | null = null;

      if (maxGrade && maxGrade > 0) {
        percentage = Number(((score / maxGrade) * 100).toFixed(2));

        if (grade.gradeType === GradeTypes.ASSIGNMENT) {
          perTypeAccum.assignment.totalPercentage += percentage;
          perTypeAccum.assignment.count += 1;
        } else if (grade.gradeType === GradeTypes.QUIZ) {
          perTypeAccum.quiz.totalPercentage += percentage;
          perTypeAccum.quiz.count += 1;
        } else if (grade.gradeType === GradeTypes.EXAM) {
          perTypeAccum.exam.totalPercentage += percentage;
          perTypeAccum.exam.count += 1;
        }
      }

      items.push({
        gradeId: grade.id,
        gradeType: grade.gradeType,
        assessmentId: grade.assessmentId ?? null,
        title,
        maxGrade,
        score,
        percentage,
        feedback: grade.feedback ?? null,
        gradedAt: grade.updatedAt,
        offering: {
          id: offeringId,
          sectionName,
          courseName,
        },
      });
    }

    const typeAverage = (key: 'assignment' | 'quiz' | 'exam') => {
      const { totalPercentage, count } = perTypeAccum[key];
      return count > 0 ? Number((totalPercentage / count).toFixed(2)) : null;
    };

    const allPercentages: number[] = [];
    for (const key of ['assignment', 'quiz', 'exam'] as const) {
      const { totalPercentage, count } = perTypeAccum[key];
      if (count > 0) {
        allPercentages.push(totalPercentage);
      }
    }

    const overallPercentage = allPercentages.length
      ? Number(
          (
            allPercentages.reduce((sum, v) => sum + v, 0) /
            allPercentages.length
          ).toFixed(2),
        )
      : null;

    return {
      student: {
        studentProfileId: studentProfile.id,
        studentId: studentProfile.student?.id,
        studentName: studentProfile.student?.name,
        rollNo: studentProfile.rollNo,
      },
      summary: {
        totalAssessments: total,
        gradedAssessments: total,
        averagesByType: {
          assignment: typeAverage('assignment'),
          quiz: typeAverage('quiz'),
          exam: typeAverage('exam'),
        },
        overallPercentage,
      },
      data: items,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }
}
