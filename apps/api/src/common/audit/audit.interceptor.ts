import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

/**
 * Records an audit row for every mutating (non-GET) request that reaches a
 * controller. Read requests are skipped to keep the log signal high.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    if (method === 'GET' || method === 'OPTIONS') {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        void this.audit.record({
          userId: req.user?.userId ?? null,
          action: `${method} ${req.route?.path ?? req.url}`,
          target: req.params?.id ?? null,
          ip: req.ip ?? req.headers?.['x-forwarded-for'] ?? null,
        });
      }),
    );
  }
}
