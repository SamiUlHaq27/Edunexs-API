import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InstitutionEntity } from './institution.entity';
import { SectionOfferingEntity } from './section-offering.entity';

@Entity({ name: 'tbl_section' })
@Index('UQ_tbl_section_institution_name', ['institution', 'name'], {
  unique: true,
})
export class SectionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => InstitutionEntity, { nullable: false })
  @JoinColumn({ name: 'institutionPrefix', referencedColumnName: 'prefix' })
  institution: InstitutionEntity;

  @OneToMany(() => SectionOfferingEntity, (offering) => offering.section)
  offerings: SectionOfferingEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
