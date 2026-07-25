import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DispatchNotificationInput {
  userId: string;
  title: string;
  body: string;
}

/**
 * Notification module (SDD 4.7, 10.6). For now this persists the in-app
 * (database) notification. Push delivery via Firebase Cloud Messaging is
 * added as an additional, asynchronous step in Phase 5 without changing
 * this method's signature or callers (SDD: "Notification delivery is
 * asynchronous and never blocks the business transaction.").
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      this.logger.error(
        `Failed to persist notification for user ${input.userId}: ${(err as Error).message}`,
      );
    }
  }
}
