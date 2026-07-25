import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SubmitDailyPlanDto {
  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  actualQuantity: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  actualManDay: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime?: number;

  @ApiPropertyOptional({
    description:
      'Mandatory when actual quantity is below planned quantity (partial/not started execution).',
    example: 'Delayed due to equipment maintenance.',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}
