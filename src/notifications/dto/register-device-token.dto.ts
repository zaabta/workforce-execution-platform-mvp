import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string;

  @ApiPropertyOptional({ enum: ['android', 'ios'], default: 'android' })
  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: string;
}
