import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { DailyPlanStatus } from '@prisma/client';

export class QueryDailyPlansDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() regionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() locationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assignedHeadMasterId?: string;

  @ApiPropertyOptional({ enum: DailyPlanStatus })
  @IsOptional()
  @IsEnum(DailyPlanStatus)
  status?: DailyPlanStatus;

  @ApiPropertyOptional() @IsOptional() @IsDateString() workDateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() workDateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: ['workDate', 'createdAt', 'status'],
    default: 'workDate',
  })
  @IsOptional()
  @IsIn(['workDate', 'createdAt', 'status'])
  sortBy?: string = 'workDate';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc' = 'desc';
}
