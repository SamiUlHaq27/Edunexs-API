import { IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ParentLoginDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  institutionId?: number;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  password: string;
}
