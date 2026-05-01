import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthEntity } from './auth.entity';
import { FileEntity } from './file.entity';

@Entity({ name: 'tbl_institution' })
export class InstitutionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  prefix: string;

  @Column()
  name: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  logoUrl: string;

  @OneToOne(() => FileEntity)
  @JoinColumn({ name: 'logoFileId' })
  logoFile?: FileEntity;

  @Column({ default: false })
  isBlocked: boolean;

  @OneToOne(() => AuthEntity)
  @JoinColumn({ name: 'ownerId' })
  owner: Awaited<AuthEntity>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
