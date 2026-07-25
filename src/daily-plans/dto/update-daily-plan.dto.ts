import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class UpdateDailyPlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  towId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
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
