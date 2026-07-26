import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user\'s notifications' })
  async list(@Query() query: QueryNotificationsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.service.list(user.userId, query.isRead, query.page ?? 1, query.limit ?? 20);
    return { items: result.items, total: result.total, page: result.page, limit: result.limit };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markAsRead(id, user.userId);
  }

  @Post('device-tokens')
  @ApiOperation({ summary: 'Register (or refresh) an FCM device token for push notifications on this account' })
  async registerDeviceToken(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() user: AuthenticatedUser) {
    await this.service.registerDeviceToken(user.userId, dto.token, dto.platform);
    return { registered: true };
  }
}
