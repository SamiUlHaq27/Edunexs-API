import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { AuthEntity } from './auth.entity';
import { StudentProfileEntity } from './student-profile.entity';

@Entity({ name: 'tbl_parent_login' })
@Unique(['student'])
export class ParentLoginEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => AuthEntity, { nullable: false })
  @JoinColumn({ name: 'studentId' })
  student: AuthEntity;

  @OneToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @Column({ type: 'character varying' })
  password: string;

  @Column({ default: true })
  isEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
