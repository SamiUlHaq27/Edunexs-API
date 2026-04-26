import { OtpStatuses } from 'src/shared/consts/otp.const';
import type { OtpStatusesType, OtpTypesType } from 'src/shared/types/otp.type';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tbl_otp')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 6 })
  otp: string;

  @Column({
    type: 'character varying',
    default: OtpStatuses.PENDING,
  })
  status: OtpStatusesType;

  @Column({
    type: 'character varying',
  })
  type: OtpTypesType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
