import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const WORKER_TYPES = [
  'SKILLED',
  'UNSKILLED',
  'TECHNICIAN',
  'OPERATOR',
  'SUPERVISOR',
] as const;

export class CreateCrewDto {
  @ApiPropertyOptional({
    description:
      'Optional client-generated UUID. Lets an offline mobile client know the crew id before the create request has synced, so it can queue a dependent worker-assignment request against the same id. If omitted, the server generates one.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

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
