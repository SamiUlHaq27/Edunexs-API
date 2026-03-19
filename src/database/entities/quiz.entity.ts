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
import { AuthEntity } from './auth.entity';
import { SectionOfferingEntity } from './section-offering.entity';

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
};

@Entity({ name: 'tbl_quiz' })
export class QuizEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'character varying', length: 200 })
  title: string;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ type: 'int' })
  maxAttempts: number;

  @Column({ type: 'jsonb' })
  questions: QuizQuestion[];

  @ManyToOne(() => SectionOfferingEntity, { nullable: false })
  @JoinColumn({ name: 'offeringId' })
  sectionOffering: SectionOfferingEntity;

  @ManyToOne(() => AuthEntity, { nullable: false })
  @JoinColumn({ name: 'createdByTeacherId' })
  createdByTeacher: AuthEntity;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
