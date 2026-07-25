import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectDailyPlanDto {
  @ApiProperty({
    description: 'Mandatory rejection reason (SDD 4.4).',
    example: 'Actual Man-Day figures require correction.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}
