import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { InstitutionEntity } from './institution.entity';
import { StudentProfileEntity } from './student-profile.entity';

export type FeeStatus = 'PENDING' | 'PAID' | 'OVERDUE';

@Entity({ name: 'tbl_fee' })
@Index('UQ_tbl_fee_invoice_no', ['invoiceNo'], { unique: true })
export class FeeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  invoiceNo: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'date' })
  dueDate: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: FeeStatus;

  @ManyToOne(() => StudentProfileEntity, { nullable: false })
  @JoinColumn({ name: 'studentProfileId' })
  studentProfile: StudentProfileEntity;

  @ManyToOne(() => InstitutionEntity, { nullable: false })
  @JoinColumn({ name: 'institutionId' })
  institution: InstitutionEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
