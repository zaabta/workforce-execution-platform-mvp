import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FcmService } from './fcm.service';

export interface DispatchNotificationInput {
  userId: string;
  title: string;
  body: string;
}

/**
 * Notification module (SDD 4.7, 10.6). Persists the in-app (database)
 * notification and, best-effort, delivers a push notification through
 * Firebase Cloud Messaging to any registered device tokens for the user.
 * Push failures never affect the database record or the calling
 * business transaction.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async dispatch(input: DispatchNotificationInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          body: input.body,
        },
      });
    } catch (err) {
      // Notifications must never block the business transaction.
      this.logger.error(`Failed to persist notification for user ${input.userId}: ${(err as Error).message}`);
      return;
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: input.userId },
      select: { token: true },
    });
    if (tokens.length > 0) {
      // Fire-and-forget: do not await synchronously blocking the request lifecycle beyond this point.
      void this.fcm.sendToTokens(
        tokens.map((t) => t.token),
        input.title,
        input.body,
      );
    }
  }

  async registerDeviceToken(userId: string, token: string, platform = 'android'): Promise<void> {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  async list(userId: string, isRead: boolean | undefined, page: number, limit: number) {
    const where = { userId, ...(isRead !== undefined ? { isRead } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found.');
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }
}

