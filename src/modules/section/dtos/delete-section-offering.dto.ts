import { IsInt } from 'class-validator';

export class DeleteSectionOfferingDto {
  @IsInt()
  offeringId: number;
}
