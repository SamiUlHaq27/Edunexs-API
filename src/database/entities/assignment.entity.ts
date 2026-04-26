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

export const AssessmentTypes = {
  ASSIGNMENT: 'assignment',
  QUIZ: 'quiz',
  EXAM: 'exam',
} as const;

@Entity({ name: 'tbl_assignment' })
export class AssignmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'character varying',
    default: AssessmentTypes.ASSIGNMENT,
  })
  assessmentType: (typeof AssessmentTypes)[keyof typeof AssessmentTypes];

  @Column({ type: 'character varying', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  dueDate: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  maxGrade: number;

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
