import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const IDEMPOTENT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const key = req.header('Idempotency-Key');

    if (!key || !IDEMPOTENT_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    this.logger.debug(`Received idempotency key: ${key}`);
    next();
  }
}
