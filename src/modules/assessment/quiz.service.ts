import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthEntity,
  GradeEntity,
  GradeTypes,
  QuizAttemptEntity,
  QuizEntity,
  QuizQuestion,
  SectionOfferingEntity,
  StudentProfileEntity,
} from 'src/database/entities';
import type { UserData } from 'src/shared/types';
import { FindOptionsWhere, In, Like, Repository } from 'typeorm';
import {
  CreateQuizDto,
  CreateQuizQuestionDto,
  ListQuizAttemptsDto,
  ListStudentQuizGradesDto,
  StudentQuizDetailDto,
  ListTeacherQuizzesDto,
  SubmitQuizAttemptDto,
  UpdateQuizDto,
} from './dtos';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizEntity)
    private readonly quizRepository: Repository<QuizEntity>,
    @InjectRepository(QuizAttemptEntity)
    private readonly quizAttemptRepository: Repository<QuizAttemptEntity>,
    @InjectRepository(GradeEntity)
    private readonly gradeRepository: Repository<GradeEntity>,
    @InjectRepository(SectionOfferingEntity)
    private readonly sectionOfferingRepository: Repository<SectionOfferingEntity>,
    @InjectRepository(StudentProfileEntity)
    private readonly studentProfileRepository: Repository<StudentProfileEntity>,
  ) {}

  async createQuiz(createQuizDto: CreateQuizDto, user: UserData) {
    const offering = await this.getTeacherOwnedOffering(
      createQuizDto.offeringId,
      user,
    );

    const startsAt = new Date(createQuizDto.startsAt);
    const endsAt = new Date(createQuizDto.endsAt);
    this.ensureValidQuizWindow(startsAt, endsAt);
    this.ensureValidQuestions(createQuizDto.questions);

    const quiz = this.quizRepository.create({
      title: createQuizDto.title,
      startsAt,
      endsAt,
      maxAttempts: createQuizDto.maxAttempts,
      questions: this.toQuizQuestions(createQuizDto.questions),
      sectionOffering: { id: offering.id },
      createdByTeacher: { id: user.authId },
      isActive: true,
    });

    const savedQuiz = await this.quizRepository.save(quiz);

    return {
      id: savedQuiz.id,
      title: savedQuiz.title,
      startsAt: savedQuiz.startsAt,
      endsAt: savedQuiz.endsAt,
      maxAttempts: savedQuiz.maxAttempts,
      totalQuestions: savedQuiz.questions.length,
      offeringId: offering.id,
      createdAt: savedQuiz.createdAt,
    };
  }

  async updateQuiz(updateQuizDto: UpdateQuizDto, user: UserData) {
    const quiz = await this.getTeacherOwnedQuiz(updateQuizDto.quizId, user);

    if (new Date() >= quiz.startsAt) {
      throw new BadRequestException(
        'Quiz cannot be updated after start time is reached',
      );
    }

    const nextStartsAt = updateQuizDto.startsAt
      ? new Date(updateQuizDto.startsAt)
      : quiz.startsAt;
    const nextEndsAt = updateQuizDto.endsAt
      ? new Date(updateQuizDto.endsAt)
      : quiz.endsAt;

    this.ensureValidQuizWindow(nextStartsAt, nextEndsAt);

    if (updateQuizDto.questions) {
      this.ensureValidQuestions(updateQuizDto.questions);
      quiz.questions = this.toQuizQuestions(updateQuizDto.questions);
    }

    if (updateQuizDto.title !== undefined) {
      quiz.title = updateQuizDto.title;
    }

    if (updateQuizDto.startsAt !== undefined) {
      quiz.startsAt = nextStartsAt;
    }

    if (updateQuizDto.endsAt !== undefined) {
      quiz.endsAt = nextEndsAt;
    }

    if (updateQuizDto.maxAttempts !== undefined) {
      quiz.maxAttempts = updateQuizDto.maxAttempts;
    }

    if (updateQuizDto.isActive !== undefined) {
      quiz.isActive = updateQuizDto.isActive;
    }

    const updated = await this.quizRepository.save(quiz);

    return {
      id: updated.id,
      title: updated.title,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      maxAttempts: updated.maxAttempts,
      totalQuestions: updated.questions.length,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  async listTeacherQuizzes(
    listTeacherQuizzesDto: ListTeacherQuizzesDto,
    user: UserData,
  ) {
    const { page, size, offeringId, title, isActive } = listTeacherQuizzesDto;
    const skip = (page - 1) * size;

    const where: FindOptionsWhere<QuizEntity> = {
      sectionOffering: {
        teacher: { id: user.authId },
        ...(offeringId ? { id: offeringId } : {}),
      },
      ...(title ? { title: Like(`%${title}%`) } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    };

    const [quizzes, total] = await this.quizRepository.findAndCount({
      where,
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: { startsAt: 'DESC', createdAt: 'DESC' },
      skip,
      take: size,
    });

    const quizIds = quizzes.map((quiz) => quiz.id);

    const attemptCounts =
      quizIds.length > 0
        ? await this.quizAttemptRepository.find({
            where: { quiz: { id: In(quizIds) } },
            relations: ['quiz'],
          })
        : [];

    const attemptsByQuiz = new Map<number, number>();
    for (const row of attemptCounts) {
      const quizId = row.quiz?.id;
      if (!quizId) continue;
      attemptsByQuiz.set(quizId, (attemptsByQuiz.get(quizId) || 0) + 1);
    }

    return {
      data: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        startsAt: quiz.startsAt,
        endsAt: quiz.endsAt,
        maxAttempts: quiz.maxAttempts,
        totalQuestions: quiz.questions.length,
        isActive: quiz.isActive,
        offering: {
          id: quiz.sectionOffering?.id,
          sectionName: quiz.sectionOffering?.section?.name,
          courseName: quiz.sectionOffering?.course?.title,
        },
        totalSubmissions: attemptsByQuiz.get(quiz.id) || 0,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      })),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  async listQuizAttempts(
    listQuizAttemptsDto: ListQuizAttemptsDto,
    user: UserData,
  ) {
    const quiz = await this.getTeacherOwnedQuiz(
      listQuizAttemptsDto.quizId,
      user,
    );

    const skip = (listQuizAttemptsDto.page - 1) * listQuizAttemptsDto.size;

    const where: FindOptionsWhere<QuizAttemptEntity> = {
      quiz: { id: quiz.id },
      ...(listQuizAttemptsDto.studentProfileId
        ? { studentProfile: { id: listQuizAttemptsDto.studentProfileId } }
        : {}),
    };

    const [attempts, total] = await this.quizAttemptRepository.findAndCount({
      where,
      relations: ['studentProfile', 'studentProfile.student'],
      order: { submittedAt: 'DESC' },
      skip,
      take: listQuizAttemptsDto.size,
    });

    const studentProfileIds = attempts.map(
      (attempt) => attempt.studentProfile.id,
    );

    const grades =
      studentProfileIds.length > 0
        ? await this.gradeRepository.find({
            where: {
              gradeType: GradeTypes.QUIZ,
              assessmentId: quiz.id,
              studentProfile: { id: In(studentProfileIds) },
            },
            relations: ['studentProfile'],
          })
        : [];

    const gradeMap = new Map<number, GradeEntity>();
    for (const grade of grades) {
      if (grade.studentProfile?.id) {
        gradeMap.set(grade.studentProfile.id, grade);
      }
    }

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        startsAt: quiz.startsAt,
        endsAt: quiz.endsAt,
        maxAttempts: quiz.maxAttempts,
        maxGrade: quiz.questions.length,
      },
      data: attempts.map((attempt) => {
        const grade = gradeMap.get(attempt.studentProfile.id);

        return {
          attemptId: attempt.id,
          submittedAt: attempt.submittedAt,
          studentProfileId: attempt.studentProfile.id,
          studentId: attempt.studentProfile.student?.id,
          studentName: attempt.studentProfile.student?.name,
          rollNo: attempt.studentProfile.rollNo,
          answers: attempt.answers,
          totalQuestionsSnapshot: attempt.totalQuestionsSnapshot,
          bestGrade: grade
            ? {
                score: Number(grade.score),
                maxGrade: attempt.totalQuestionsSnapshot,
                percentage:
                  attempt.totalQuestionsSnapshot > 0
                    ? Number(
                        (
                          (Number(grade.score) /
                            attempt.totalQuestionsSnapshot) *
                          100
                        ).toFixed(2),
                      )
                    : 0,
                updatedAt: grade.updatedAt,
              }
            : null,
        };
      }),
      total,
      page: listQuizAttemptsDto.page,
      size: listQuizAttemptsDto.size,
      totalPages: Math.ceil(total / listQuizAttemptsDto.size),
    };
  }

  async submitQuizAttempt(
    submitQuizAttemptDto: SubmitQuizAttemptDto,
    user: UserData,
  ) {
    const studentProfile = await this.getStudentProfileForUser(user.authId);

    const quiz = await this.quizRepository.findOne({
      where: {
        id: submitQuizAttemptDto.quizId,
        isActive: true,
      },
      relations: [
        'sectionOffering',
        'sectionOffering.teacher',
        'createdByTeacher',
      ],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const now = new Date();
    if (now < quiz.startsAt || now > quiz.endsAt) {
      throw new BadRequestException(
        'Quiz can only be attempted in active time window',
      );
    }

    const enrolledOfferingIds = new Set(
      (studentProfile.sectionOfferings || []).map((offering) => offering.id),
    );

    if (!enrolledOfferingIds.has(quiz.sectionOffering.id)) {
      throw new ForbiddenException(
        'You are not enrolled in this quiz offering',
      );
    }

    this.ensureValidSubmittedAnswers(
      quiz.questions,
      submitQuizAttemptDto.answers,
    );

    const attemptsUsed = await this.quizAttemptRepository.count({
      where: {
        quiz: { id: quiz.id },
        studentProfile: { id: studentProfile.id },
      },
    });

    if (attemptsUsed >= quiz.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached for this quiz');
    }

    const score = this.calculateQuizScore(
      quiz.questions,
      submitQuizAttemptDto.answers,
    );
    const submittedAt = new Date();

    const savedAttempt = await this.quizAttemptRepository.save(
      this.quizAttemptRepository.create({
        quiz: { id: quiz.id },
        studentProfile: { id: studentProfile.id },
        answers: submitQuizAttemptDto.answers,
        totalQuestionsSnapshot: quiz.questions.length,
        submittedAt,
      }),
    );

    let grade = await this.gradeRepository.findOne({
      where: {
        gradeType: GradeTypes.QUIZ,
        assessmentId: quiz.id,
        studentProfile: { id: studentProfile.id },
        sectionOffering: { id: quiz.sectionOffering.id },
      },
      relations: ['studentProfile', 'sectionOffering'],
    });

    if (!grade) {
      grade = this.gradeRepository.create({
        gradeType: GradeTypes.QUIZ,
        assessmentId: quiz.id,
        studentProfile: { id: studentProfile.id },
        sectionOffering: { id: quiz.sectionOffering.id },
        gradedByTeacher: { id: quiz.createdByTeacher.id },
        score,
      });
      grade = await this.gradeRepository.save(grade);
    } else if (score > Number(grade.score)) {
      grade.score = score;
      grade.gradedByTeacher = { id: quiz.createdByTeacher.id } as AuthEntity;
      grade = await this.gradeRepository.save(grade);
    }

    return {
      attemptId: savedAttempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        startsAt: quiz.startsAt,
        endsAt: quiz.endsAt,
      },
      studentProfileId: studentProfile.id,
      submittedAt: savedAttempt.submittedAt,
      score,
      maxGrade: quiz.questions.length,
      percentage:
        quiz.questions.length > 0
          ? Number(((score / quiz.questions.length) * 100).toFixed(2))
          : 0,
      attemptsUsed: attemptsUsed + 1,
      attemptsRemaining: Math.max(quiz.maxAttempts - (attemptsUsed + 1), 0),
      bestScore: Number(grade?.score || score),
      message: 'Quiz attempt submitted successfully',
    };
  }

  async getStudentQuizDetail(
    studentQuizDetailDto: StudentQuizDetailDto,
    user: UserData,
  ) {
    const studentProfile = await this.getStudentProfileForUser(user.authId);

    const quiz = await this.quizRepository.findOne({
      where: {
        id: studentQuizDetailDto.quizId,
        isActive: true,
      },
      relations: [
        'sectionOffering',
        'sectionOffering.section',
        'sectionOffering.course',
      ],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const enrolledOfferingIds = new Set(
      (studentProfile.sectionOfferings || []).map((offering) => offering.id),
    );

    if (!enrolledOfferingIds.has(quiz.sectionOffering.id)) {
      throw new ForbiddenException(
        'You are not enrolled in this quiz offering',
      );
    }

    const attemptsUsed = await this.quizAttemptRepository.count({
      where: {
        quiz: { id: quiz.id },
        studentProfile: { id: studentProfile.id },
      },
    });

    const now = new Date();
    const window: 'upcoming' | 'active' | 'closed' =
      now < quiz.startsAt
        ? 'upcoming'
        : now > quiz.endsAt
          ? 'closed'
          : 'active';

    const attemptsRemaining = Math.max(quiz.maxAttempts - attemptsUsed, 0);

    return {
      quizId: quiz.id,
      title: quiz.title,
      startsAt: quiz.startsAt,
      endsAt: quiz.endsAt,
      offering: {
        id: quiz.sectionOffering?.id,
        sectionName: quiz.sectionOffering?.section?.name,
        courseName: quiz.sectionOffering?.course?.title,
      },
      totalQuestions: quiz.questions.length,
      maxAttempts: quiz.maxAttempts,
      attemptsUsed,
      attemptsRemaining,
      canAttempt: window === 'active' && attemptsRemaining > 0,
      serverNow: now.toISOString(),
      window,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
      })),
    };
  }

  async listStudentQuizGrades(
    listStudentQuizGradesDto: ListStudentQuizGradesDto,
    user: UserData,
  ) {
    const studentProfile = await this.getStudentProfileForUser(user.authId);

    const enrolledOfferingIds = (studentProfile.sectionOfferings || []).map(
      (offering) => offering.id,
    );

    if (enrolledOfferingIds.length === 0) {
      return {
        data: [],
        total: 0,
        page: listStudentQuizGradesDto.page,
        size: listStudentQuizGradesDto.size,
        totalPages: 0,
      };
    }

    if (
      listStudentQuizGradesDto.offeringId &&
      !enrolledOfferingIds.includes(listStudentQuizGradesDto.offeringId)
    ) {
      throw new ForbiddenException('Offering does not belong to the student');
    }

    const where: FindOptionsWhere<QuizEntity> = {
      sectionOffering: {
        id: In(enrolledOfferingIds),
        ...(listStudentQuizGradesDto.offeringId
          ? { id: listStudentQuizGradesDto.offeringId }
          : {}),
      },
      isActive: true,
    };

    const skip =
      (listStudentQuizGradesDto.page - 1) * listStudentQuizGradesDto.size;

    const [quizzes, total] = await this.quizRepository.findAndCount({
      where,
      relations: [
        'sectionOffering',
        'sectionOffering.course',
        'sectionOffering.section',
      ],
      order: { startsAt: 'DESC' },
      skip,
      take: listStudentQuizGradesDto.size,
    });

    const quizIds = quizzes.map((quiz) => quiz.id);

    const grades =
      quizIds.length > 0
        ? await this.gradeRepository.find({
            where: {
              gradeType: GradeTypes.QUIZ,
              assessmentId: In(quizIds),
              studentProfile: { id: studentProfile.id },
            },
          })
        : [];

    const attempts =
      quizIds.length > 0
        ? await this.quizAttemptRepository.find({
            where: {
              quiz: { id: In(quizIds) },
              studentProfile: { id: studentProfile.id },
            },
            relations: ['quiz'],
          })
        : [];

    const gradeByQuizId = new Map<number, GradeEntity>();
    for (const grade of grades) {
      if (grade.assessmentId) {
        gradeByQuizId.set(grade.assessmentId, grade);
      }
    }

    const attemptsByQuizId = new Map<number, number>();
    for (const attempt of attempts) {
      const quizId = attempt.quiz?.id;
      if (!quizId) continue;
      attemptsByQuizId.set(quizId, (attemptsByQuizId.get(quizId) || 0) + 1);
    }

    return {
      data: quizzes.map((quiz) => {
        const grade = gradeByQuizId.get(quiz.id);
        const maxGrade = quiz.questions.length;
        const bestScore = grade ? Number(grade.score) : null;

        return {
          quizId: quiz.id,
          title: quiz.title,
          startsAt: quiz.startsAt,
          endsAt: quiz.endsAt,
          maxAttempts: quiz.maxAttempts,
          attemptsUsed: attemptsByQuizId.get(quiz.id) || 0,
          maxGrade,
          bestScore,
          percentage:
            bestScore !== null && maxGrade > 0
              ? Number(((bestScore / maxGrade) * 100).toFixed(2))
              : null,
          offering: {
            id: quiz.sectionOffering?.id,
            sectionName: quiz.sectionOffering?.section?.name,
            courseName: quiz.sectionOffering?.course?.title,
          },
          gradedAt: grade?.updatedAt || null,
        };
      }),
      total,
      page: listStudentQuizGradesDto.page,
      size: listStudentQuizGradesDto.size,
      totalPages: Math.ceil(total / listStudentQuizGradesDto.size),
    };
  }

  private async getTeacherOwnedOffering(offeringId: number, user: UserData) {
    const offering = await this.sectionOfferingRepository.findOne({
      where: {
        id: offeringId,
        teacher: { id: user.authId },
      },
      relations: ['teacher'],
    });

    if (!offering) {
      throw new NotFoundException(
        'Section offering not found for this teacher',
      );
    }

    return offering;
  }

  private async getTeacherOwnedQuiz(quizId: number, user: UserData) {
    const quiz = await this.quizRepository.findOne({
      where: {
        id: quizId,
        sectionOffering: {
          teacher: { id: user.authId },
        },
      },
      relations: ['sectionOffering', 'sectionOffering.teacher'],
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found for this teacher');
    }

    return quiz;
  }

  private async getStudentProfileForUser(authId: number) {
    const studentProfile = await this.studentProfileRepository.findOne({
      where: { student: { id: authId } },
      relations: ['student', 'sectionOfferings'],
    });

    if (!studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    return studentProfile;
  }

  private ensureValidQuizWindow(startsAt: Date, endsAt: Date) {
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid quiz start/end time');
    }

    if (startsAt >= endsAt) {
      throw new BadRequestException('Quiz start time must be before end time');
    }
  }

  private ensureValidQuestions(questions: CreateQuizQuestionDto[]) {
    if (!questions?.length) {
      throw new BadRequestException('Quiz must contain at least one question');
    }

    const questionIds = new Set<string>();

    for (const question of questions) {
      if (!question.id || questionIds.has(question.id)) {
        throw new BadRequestException(
          'Question ids must be unique and non-empty',
        );
      }
      questionIds.add(question.id);

      if (!question.options || question.options.length < 2) {
        throw new BadRequestException(
          `Question ${question.id} must contain at least two options`,
        );
      }

      if (
        question.correctOptionIndex < 0 ||
        question.correctOptionIndex >= question.options.length
      ) {
        throw new BadRequestException(
          `Question ${question.id} has invalid correctOptionIndex`,
        );
      }
    }
  }

  private toQuizQuestions(questions: CreateQuizQuestionDto[]): QuizQuestion[] {
    return questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
    }));
  }

  private calculateQuizScore(
    questions: QuizQuestion[],
    answers: SubmitQuizAttemptDto['answers'],
  ) {
    const answerMap = new Map<string, number>();
    for (const answer of answers) {
      if (!answerMap.has(answer.questionId)) {
        answerMap.set(answer.questionId, answer.selectedOptionIndex);
      }
    }

    let score = 0;
    for (const question of questions) {
      const selected = answerMap.get(question.id);
      if (selected !== undefined && selected === question.correctOptionIndex) {
        score += 1;
      }
    }

    return score;
  }

  private ensureValidSubmittedAnswers(
    questions: QuizQuestion[],
    answers: SubmitQuizAttemptDto['answers'],
  ) {
    const questionMap = new Map<string, QuizQuestion>();
    for (const question of questions) {
      questionMap.set(question.id, question);
    }

    const answeredQuestionIds = new Set<string>();

    for (const answer of answers) {
      if (answeredQuestionIds.has(answer.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for questionId ${answer.questionId}`,
        );
      }
      answeredQuestionIds.add(answer.questionId);

      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Unknown questionId ${answer.questionId} in submission`,
        );
      }

      if (
        answer.selectedOptionIndex < 0 ||
        answer.selectedOptionIndex >= question.options.length
      ) {
        throw new BadRequestException(
          `Invalid selected option for questionId ${answer.questionId}`,
        );
      }
    }
  }
}
