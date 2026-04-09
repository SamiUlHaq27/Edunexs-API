import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AuthEntity } from './auth.entity';
import { SectionOfferingEntity } from './section-offering.entity';
import { StudentProfileEntity } from './student-profile.entity';

export const GradeTypes = {
  ASSIGNMENT: 'assignment',
  QUIZ: 'quiz',
  EXAM: 'exam',
} as const;

@Entity({ name: 'tbl_grade' })
@Unique(['gradeType', 'studentProfile', 'sectionOffering', 'assessmentId'])
export class GradeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'character varying' })
  gradeType: (typeof GradeTypes)[keyof typeof GradeTypes];

  @ManyToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @ManyToOne(() => AuthEntity, { nullable: false })
  @JoinColumn({ name: 'gradedByTeacherId' })
  gradedByTeacher: AuthEntity;

  @ManyToOne(() => SectionOfferingEntity, { nullable: false })
  @JoinColumn({ name: 'offeringId' })
  sectionOffering: SectionOfferingEntity;

  @Column({ type: 'int', nullable: true })
  assessmentId?: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
