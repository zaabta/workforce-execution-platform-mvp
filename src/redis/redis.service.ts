import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around ioredis used for:
 *  - Permission cache (effective permissions per user/project)
 *  - Role cache
 *  - User scope cache
 *  - Frequently accessed reference/master data (Projects, Regions, Locations, WBS)
 *
 * SDD Section 6.1 "Redis Cache".
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      this.available = false;
      this.logger.warn(`Redis unavailable: ${err.message}`);
    });
    this.client.on('connect', () => {
      this.available = true;
      this.logger.log('Connected to Redis');
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.available = false;
      this.logger.warn(
        `Redis not available at startup: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.available || !this.client) {
      return null;
    }

    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      this.available = false;
      this.logger.warn(
        `Redis GET fallback for key=${key}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.available || !this.client) {
      return;
    }

    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, payload, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, payload);
      }
    } catch (err) {
      this.available = false;
      this.logger.warn(
        `Redis SET failed for key=${key}: ${(err as Error).message}`,
      );
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.available || !this.client || !keys.length) {
      return;
    }

    try {
      await this.client.del(...keys);
    } catch (err) {
      this.available = false;
      this.logger.warn(`Redis DEL failed: ${(err as Error).message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.available || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length) await this.client.del(...keys);
    } catch (err) {
      this.available = false;
      this.logger.warn(
        `Redis DEL pattern failed for pattern=${pattern}: ${(err as Error).message}`,
      );
    }
  }
}
