/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        const req = context.switchToHttp().getRequest();
        if (!req) {
          return throwError(() => err);
        }

        const status =
          err instanceof HttpException
            ? err.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const originalResponse =
          err instanceof HttpException ? err.getResponse() : null;
        let message = err.message || 'Internal server error';

        if (originalResponse && typeof originalResponse === 'object') {
          message = (originalResponse as any).message || message;
        }

        const tenantId = req['tenantId'] || 'unknown';

        const errorResponse = {
          success: false,
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: req.url,
          tenantId,
          error: {
            message: Array.isArray(message) ? message[0] : message,
            code: err.code || 'GATEWAY_ERROR',
          },
        };

        return throwError(() => new HttpException(errorResponse, status));
      }),
    );
  }
}
