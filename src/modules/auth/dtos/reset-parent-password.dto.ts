import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetParentPasswordDto {
  @IsInt()
  studentId: number;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  newPassword: string;
}
