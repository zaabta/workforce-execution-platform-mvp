import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the current authenticated user profile, roles, and scopes',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.usersService.getProfile(user.userId);
    return {
      success: true,
      data: profile,
      message: 'Profile retrieved successfully.',
    };
  }
}
