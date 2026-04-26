import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthEntity } from './auth.entity';
import { CourseEntity } from './course.entity';
import { SectionEntity } from './section.entity';
import { StudentProfileEntity } from './student-profile.entity';

@Entity({ name: 'tbl_section_offering' })
@Index('UQ_tbl_section_offering_section_course', ['section', 'course'], {
  unique: true,
})
export class SectionOfferingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SectionEntity, (section) => section.offerings, {
    nullable: false,
  })
  @JoinColumn({ name: 'sectionId' })
  section: SectionEntity;

  @ManyToOne(() => CourseEntity, (course) => course.sectionOfferings, {
    nullable: false,
  })
  @JoinColumn({ name: 'courseId' })
  course: Awaited<CourseEntity>;

  @ManyToOne(() => AuthEntity, {
    nullable: false,
  })
  @JoinColumn({ name: 'teacherId' })
  teacher: AuthEntity;

  @ManyToMany(
    () => StudentProfileEntity,
    (studentProfile) => studentProfile.sectionOfferings,
  )
  @JoinTable({
    name: 'tbl_section_offering_student_profile',
    joinColumn: { name: 'offeringId', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'studentProfileId',
      referencedColumnName: 'id',
    },
  })
  students: StudentProfileEntity[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
