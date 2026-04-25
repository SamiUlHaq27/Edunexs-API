import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class AddStudentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  studentProfileIds: number[];
}
