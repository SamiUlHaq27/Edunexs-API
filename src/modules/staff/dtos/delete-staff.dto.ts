import { IsInt } from 'class-validator';

export class DeleteStaffDto {
  @IsInt()
  staffId: number;
}
