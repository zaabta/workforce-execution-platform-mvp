import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  Matches,
} from 'class-validator';

const UUID_CANONICAL_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UpdateDailyPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_CANONICAL_REGEX, { message: 'towId must be a UUID' })
  towId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_CANONICAL_REGEX, { message: 'stowId must be a UUID' })
  stowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(UUID_CANONICAL_REGEX, { message: 'sstowId must be a UUID' })
  sstowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  plannedManDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  workDate?: string;
}
