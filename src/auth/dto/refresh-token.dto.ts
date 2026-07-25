import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'e7e6a1e0-7c2b-4f7e-9c2a-3f1a2b3c4d5e.7c2b4f7e9c2a3f1a2b3c4d5e',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
