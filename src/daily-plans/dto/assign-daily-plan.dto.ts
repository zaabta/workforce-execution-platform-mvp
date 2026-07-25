import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignDailyPlanDto {
  @ApiProperty({
    description:
      'User id of the Head of Master responsible for field execution',
  })
  @IsUUID()
  headOfMasterId: string;
}
