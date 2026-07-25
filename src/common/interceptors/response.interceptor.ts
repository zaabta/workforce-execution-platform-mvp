import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((payload) => {
        // 204 No Content must not carry a response body.
        if (response.statusCode === 204) return undefined;

        if (payload && typeof payload === 'object' && 'success' in payload) {
          return payload;
        }
        return {
          success: true,
          data: payload ?? null,
          message: 'Operation completed successfully.',
        };
      }),
    );
  }
}
