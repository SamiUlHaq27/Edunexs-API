import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InstitutionEntity } from './institution.entity';
import { SectionOfferingEntity } from './section-offering.entity';

@Entity({ name: 'tbl_course' })
export class CourseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => InstitutionEntity, { nullable: false })
  @JoinColumn({ name: 'institutionPrefix', referencedColumnName: 'prefix' })
  institution: InstitutionEntity;

  @OneToMany(() => SectionOfferingEntity, (offering) => offering.course)
  sectionOfferings: SectionOfferingEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
