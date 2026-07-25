import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and issue access/refresh tokens',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
  ): Promise<{ success: true; data: AuthResponseDto; message: string }> {
    const tokens = await this.authService.login(dto.email, dto.password, {
      ip,
    });
    return { success: true, data: tokens, message: 'Login successful.' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Exchange a valid refresh token for a new access/refresh token pair',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid, revoked, or expired.',
  })
  @ApiBadRequestResponse({ description: 'Validation error.' })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ success: true; data: AuthResponseDto; message: string }> {
    const tokens = await this.authService.refresh(dto.refreshToken);
    return {
      success: true,
      data: tokens,
      message: 'Token refreshed successfully.',
    };
  }
}
