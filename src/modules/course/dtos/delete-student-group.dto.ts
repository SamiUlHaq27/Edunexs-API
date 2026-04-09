import { IsInt } from 'class-validator';

export class DeleteStudentGroupDto {
  @IsInt()
  groupId: number;
}
