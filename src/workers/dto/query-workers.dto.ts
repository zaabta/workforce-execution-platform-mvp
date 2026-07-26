import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WORKER_TYPES } from '../../crews/dto/create-crew.dto';

export class QueryWorkersDto {
  @ApiPropertyOptional({ description: 'Search by employee number or full name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: WORKER_TYPES })
  @IsOptional()
  @IsIn(WORKER_TYPES)
  type?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
