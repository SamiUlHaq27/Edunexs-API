import { UserRoleEnum } from 'src/shared/enums';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity({ name: 'tbl_auth' })
export class AuthEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'character varying', nullable: true })
  name: string;

  @OneToOne(() => FileEntity)
  @JoinColumn({ name: 'profilePictureFileId' })
  profilePictureFile?: FileEntity;

  @Column({ type: 'character varying' })
  role: UserRoleEnum;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
