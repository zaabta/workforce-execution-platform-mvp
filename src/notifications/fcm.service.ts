import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private enabled = false;
  private admin: any;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured - push notifications are disabled.',
      );
      return;
    }

    try {
      this.admin = require('firebase-admin');
    } catch (error) {
      this.logger.warn(
        `Firebase Admin SDK is not installed: ${(error as Error).message}`,
      );
      return;
    }

    if (!this.admin.apps.length) {
      this.admin.initializeApp({
        credential: this.admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    this.enabled = true;
  }

  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.enabled || tokens.length === 0) return;

    try {
      const response = await this.admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
      });

      if (response.failureCount > 0) {
        this.logger.warn(
          `FCM delivered with ${response.failureCount} failures.`,
        );
      }
    } catch (error) {
      this.logger.error(`FCM send failed: ${(error as Error).message}`);
    }
  }
}
