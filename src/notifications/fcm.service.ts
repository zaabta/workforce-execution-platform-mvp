import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Thin wrapper around firebase-admin messaging. Push delivery is
 * best-effort and must never throw back into the calling business
 * transaction (SDD 10.6: "Notification delivery is asynchronous and
 * never blocks the business transaction.").
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private enabled = false;
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not configured - push notifications are disabled.');
      return;
    }

    const existingApps = getApps();
    this.app = existingApps.length > 0
      ? existingApps[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });

    this.enabled = true;
  }

  async sendToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!this.enabled || !this.app || tokens.length === 0) return;

    try {
      const response = await getMessaging(this.app).sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
      });
      if (response.failureCount > 0) {
        this.logger.warn(`FCM: ${response.failureCount} of ${tokens.length} deliveries failed.`);
      }
    } catch (err) {
      this.logger.error(`FCM send failed: ${(err as Error).message}`);
    }
  }
}
