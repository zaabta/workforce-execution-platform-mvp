import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class AssignWorkerDto {
  @ApiPropertyOptional({ description: 'Existing worker id. Omit if providing employeeNo/fullName instead.' })
  @ValidateIf((o) => !o.employeeNo)
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ description: 'Employee number, used to find-or-create the worker if workerId is not provided.' })
  @ValidateIf((o) => !o.workerId)
  @IsString()
  employeeNo?: string;

  @ApiPropertyOptional({ description: 'Full name, required together with employeeNo when creating a new worker.' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
