import { IsInt } from 'class-validator';

export class DeleteSectionDto {
  @IsInt()
  sectionId: number;
}
