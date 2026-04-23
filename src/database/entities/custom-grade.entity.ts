import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SectionOfferingEntity } from './section-offering.entity';

@Entity({ name: 'tbl_custom_grade' })
export class CustomGradeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'character varying', length: 200 })
  title: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  maxGrade: number;

  @ManyToOne(() => SectionOfferingEntity, { nullable: false })
  @JoinColumn({ name: 'offeringId' })
  sectionOffering: SectionOfferingEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
