import { IsInt } from 'class-validator';

export class DeleteInstitutionAdminDto {
  @IsInt()
  institutionAdminId: number;
}
