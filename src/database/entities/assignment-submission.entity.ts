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
import { AssignmentEntity } from './assignment.entity';
import { FileEntity } from './file.entity';
import { StudentProfileEntity } from './student-profile.entity';

export const AssignmentSubmissionStatus = {
  SUBMITTED: 'submitted',
  GRADED: 'graded',
} as const;

@Entity({ name: 'tbl_assignment_submission' })
@Unique(['assignment', 'studentProfile'])
export class AssignmentSubmissionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AssignmentEntity, { nullable: false })
  @JoinColumn({ name: 'assignmentId' })
  assignment: AssignmentEntity;

  @ManyToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @ManyToOne(() => FileEntity, { nullable: false })
  @JoinColumn({ name: 'submittedFileId' })
  submittedFile: FileEntity;

  @Column({ type: 'timestamp' })
  submittedAt: Date;

  @Column({ default: false })
  isLate: boolean;

  @Column({
    type: 'character varying',
    default: AssignmentSubmissionStatus.SUBMITTED,
  })
  status: (typeof AssignmentSubmissionStatus)[keyof typeof AssignmentSubmissionStatus];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
