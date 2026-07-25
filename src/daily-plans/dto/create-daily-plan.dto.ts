import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateDailyPlanDto {
  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abc' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abd' })
  @IsUUID()
  regionId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789abe' })
  @IsUUID()
  locationId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab1' })
  @IsUUID()
  towId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab2' })
  @IsUUID()
  stowId: string;

  @ApiProperty({ example: 'b6f1e2b0-1a2b-4c3d-9e0f-123456789ab3' })
  @IsUUID()
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
