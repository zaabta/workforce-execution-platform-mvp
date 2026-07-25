import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export const WORKER_TYPES = [
  'SKILLED',
  'UNSKILLED',
  'TECHNICIAN',
  'OPERATOR',
  'SUPERVISOR',
] as const;

export class CreateCrewDto {
  @ApiProperty({ description: 'The daily plan this crew executes work for' })
  @IsUUID()
  dailyPlanId: string;

  @ApiProperty({ example: 'Excavation Crew A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: WORKER_TYPES, example: 'SKILLED' })
  @IsIn(WORKER_TYPES)
  workerType: string;
}
