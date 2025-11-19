import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OtpStatusEnum {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
}

export enum OtpTypeEnum {
  SIGNUP = 'signup',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
}

@Entity('tbl_otp')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 6 })
  otp: string;

  @Column({
    type: 'enum',
    enum: OtpStatusEnum,
    default: OtpStatusEnum.PENDING,
  })
  status: OtpStatusEnum;

  @Column({
    type: 'enum',
    enum: OtpTypeEnum,
  })
  type: OtpTypeEnum;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
