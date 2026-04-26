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
import { StudentProfileEntity } from './student-profile.entity';

@Entity({ name: 'tbl_parent_student' })
@Unique(['parent', 'studentProfile'])
export class ParentStudentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AuthEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentAuthId' })
  parent: AuthEntity;

  @ManyToOne(() => StudentProfileEntity, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
