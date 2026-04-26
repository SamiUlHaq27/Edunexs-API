import {
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

@Entity({ name: 'tbl_assignment_attachment' })
@Unique(['assignment', 'file'])
export class AssignmentAttachmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AssignmentEntity, { nullable: false })
  @JoinColumn({ name: 'assignmentId' })
  assignment: AssignmentEntity;

  @ManyToOne(() => FileEntity, { nullable: false })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
