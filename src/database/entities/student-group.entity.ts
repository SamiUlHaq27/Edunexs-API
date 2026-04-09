import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InstitutionEntity } from './institution.entity';
import { StudentProfileEntity } from './student-profile.entity';

@Entity({ name: 'tbl_student_group' })
export class StudentGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => InstitutionEntity, { nullable: false })
  @JoinColumn({ name: 'institutionPrefix', referencedColumnName: 'prefix' })
  institution: InstitutionEntity;

  @ManyToMany(
    () => StudentProfileEntity,
    (studentProfile) => studentProfile.studentGroups,
  )
  @JoinTable({
    name: 'tbl_student_group_student_profile',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'studentProfileId',
      referencedColumnName: 'id',
    },
  })
  students: StudentProfileEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
