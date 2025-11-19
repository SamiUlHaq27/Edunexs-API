import { IsInt, IsObject } from 'class-validator';

export class ListFiltersDto {
  @IsInt()
  page: number;

  @IsInt()
  size: number;

  @IsObject()
  filters: object;
}
