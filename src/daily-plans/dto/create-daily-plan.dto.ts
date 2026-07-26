import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsPositive,
  Matches,
} from 'class-validator';

const UUID_CANONICAL_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateDailyPlanDto {
  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abc' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'projectId must be a UUID' })
  projectId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abd' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'regionId must be a UUID' })
  regionId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abe' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'locationId must be a UUID' })
  locationId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab1' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'towId must be a UUID' })
  towId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab2' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'stowId must be a UUID' })
  stowId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab3' })
  @Matches(UUID_CANONICAL_REGEX, { message: 'sstowId must be a UUID' })
  sstowId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  plannedQuantity: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @IsPositive()
  plannedManDay: number;

  @ApiProperty({ example: '2026-07-24' })
  @IsDateString()
  workDate: string;
}
