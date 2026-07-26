import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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

  @Get()
  @ApiOperation({ summary: 'List users with optional role filtering' })
  @ApiQuery({
    name: 'role',
    type: 'string',
    required: false,
    description: 'Role name filter, e.g. Head of Master',
  })
  @ApiQuery({
    name: 'projectId',
    type: 'string',
    required: false,
    description: 'Project ID filter',
  })
  @ApiQuery({
    name: 'regionId',
    type: 'string',
    required: false,
    description: 'Region ID filter',
  })
  @ApiQuery({
    name: 'locationId',
    type: 'string',
    required: false,
    description: 'Location ID filter',
  })
  async listUsers(
    @Query('role') role?: string,
    @Query('projectId') projectId?: string,
    @Query('regionId') regionId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.usersService.listUsers(role, projectId, regionId, locationId);
  }

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
