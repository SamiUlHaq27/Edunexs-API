import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class RemoveStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  studentProfileIds: number[];
}
