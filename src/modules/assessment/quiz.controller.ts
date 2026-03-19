import { Body, Controller, Post, Version } from '@nestjs/common';
import { UserRoles } from 'src/shared/consts';
import { User } from 'src/shared/pipes';
import { AllowedRoles } from 'src/shared/reflectors';
import type { UserData } from 'src/shared/types';
import {
  CreateQuizDto,
  ListQuizAttemptsDto,
  ListStudentQuizGradesDto,
  ListTeacherQuizzesDto,
  SubmitQuizAttemptDto,
  UpdateQuizDto,
} from './dtos';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/create')
  async createQuiz(
    @Body() createQuizDto: CreateQuizDto,
    @User() user: UserData,
  ) {
    return await this.quizService.createQuiz(createQuizDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/update')
  async updateQuiz(
    @Body() updateQuizDto: UpdateQuizDto,
    @User() user: UserData,
  ) {
    return await this.quizService.updateQuiz(updateQuizDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/all')
  async listTeacherQuizzes(
    @Body() listTeacherQuizzesDto: ListTeacherQuizzesDto,
    @User() user: UserData,
  ) {
    return await this.quizService.listTeacherQuizzes(
      listTeacherQuizzesDto,
      user,
    );
  }

  @Version('1')
  @AllowedRoles([UserRoles.TEACHER])
  @Post('teacher/submissions')
  async listQuizAttempts(
    @Body() listQuizAttemptsDto: ListQuizAttemptsDto,
    @User() user: UserData,
  ) {
    return await this.quizService.listQuizAttempts(listQuizAttemptsDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT])
  @Post('student/submit')
  async submitQuizAttempt(
    @Body() submitQuizAttemptDto: SubmitQuizAttemptDto,
    @User() user: UserData,
  ) {
    return await this.quizService.submitQuizAttempt(submitQuizAttemptDto, user);
  }

  @Version('1')
  @AllowedRoles([UserRoles.STUDENT])
  @Post('student/grades')
  async listStudentQuizGrades(
    @Body() listStudentQuizGradesDto: ListStudentQuizGradesDto,
    @User() user: UserData,
  ) {
    return await this.quizService.listStudentQuizGrades(
      listStudentQuizGradesDto,
      user,
    );
  }
}
