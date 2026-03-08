import {
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { AuthEntity } from './auth.entity';
import { InstitutionEntity } from './institution.entity';
import { StudentGroupEntity } from './student-group.entity';

@Entity({ name: 'tbl_student_profile' })
export class StudentProfileEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  rollNo: string;

  @Column({ type: 'varchar', length: 100 })
  grade: string;

  @OneToOne(() => AuthEntity, { nullable: false })
  @JoinColumn({ name: 'studentId' })
  student: AuthEntity;

  @ManyToOne(() => InstitutionEntity, { nullable: false })
  @JoinColumn({ name: 'institutionPrefix', referencedColumnName: 'prefix' })
  institution: InstitutionEntity;

  @ManyToMany(() => StudentGroupEntity, (studentGroup) => studentGroup.students)
  studentGroups: StudentGroupEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
