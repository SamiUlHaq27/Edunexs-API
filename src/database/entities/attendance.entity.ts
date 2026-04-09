import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SectionOfferingEntity } from './section-offering.entity';
import { StudentProfileEntity } from './student-profile.entity';

export const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
} as const;

export type AttendanceStatusType =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

@Entity({ name: 'tbl_attendance' })
@Index(
  'UQ_tbl_attendance_section_student_date_slot',
  ['sectionOffering', 'studentProfile', 'attendanceDate', 'periodSlot'],
  { unique: true },
)
@Index('IDX_tbl_attendance_section_date', ['sectionOffering', 'attendanceDate'])
export class AttendanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => SectionOfferingEntity, { nullable: false })
  @JoinColumn({ name: 'sectionOfferingId' })
  sectionOffering: SectionOfferingEntity;

  @ManyToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @Column({ type: 'date' })
  attendanceDate: string;

  @Column({ type: 'varchar', length: 50 })
  periodSlot: string;

  @Column({ type: 'character varying', length: 20 })
  status: AttendanceStatusType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
