import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentProfileEntity } from './student-profile.entity';
import { QuizEntity } from './quiz.entity';

export type QuizAttemptAnswer = {
  questionId: string;
  selectedOptionIndex: number;
};

@Entity({ name: 'tbl_quiz_attempt' })
export class QuizAttemptEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuizEntity, { nullable: false })
  @JoinColumn({ name: 'quizId' })
  quiz: QuizEntity;

  @ManyToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @Column({ type: 'jsonb' })
  answers: QuizAttemptAnswer[];

  @Column({ type: 'int' })
  totalQuestionsSnapshot: number;

  @Column({ type: 'timestamp' })
  submittedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
