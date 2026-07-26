import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DailyPlanStatus } from '@prisma/client';

const UUID_CANONICAL_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class QueryDailyPlansDto {
  @ApiPropertyOptional() @IsOptional() @Matches(UUID_CANONICAL_REGEX, { message: 'projectId must be a UUID' }) projectId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(UUID_CANONICAL_REGEX, { message: 'regionId must be a UUID' }) regionId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(UUID_CANONICAL_REGEX, { message: 'locationId must be a UUID' }) locationId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(UUID_CANONICAL_REGEX, { message: 'assignedHeadMasterId must be a UUID' }) assignedHeadMasterId?: string;

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
