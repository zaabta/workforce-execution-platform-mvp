import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WORKER_TYPES } from '../../crews/dto/create-crew.dto';

export class CreateWorkerDto {
  @ApiProperty({ example: 'EMP-1042' })
  @IsString()
  @IsNotEmpty()
  employeeNo: string;

  @ApiProperty({ example: 'Karim Abdullah' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ enum: WORKER_TYPES, default: 'SKILLED' })
  @IsOptional()
  @IsIn(WORKER_TYPES)
  type?: string;
}
