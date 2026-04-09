import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';
import { InstitutionEntity } from './institution.entity';
import type { UserRolesType } from 'src/shared/types/user.type';

@Entity({ name: 'tbl_auth' })
@Unique(['institution', 'username'])
export class AuthEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  username: string;

  @ManyToOne(() => InstitutionEntity)
  @JoinColumn({ name: 'institutionPrefix', referencedColumnName: 'prefix' })
  institution?: InstitutionEntity;

  @Column()
  password: string;

  @Column({ type: 'character varying', nullable: true })
  name: string;

  @OneToOne(() => FileEntity)
  @JoinColumn({ name: 'profilePictureFileId' })
  profilePictureFile?: FileEntity;

  @Column({ type: 'character varying' })
  role: UserRolesType;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
