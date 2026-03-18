import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { logger } from "../logger/logger";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest();
		const { method, url } = req;

		const now = Date.now();

		return next.handle().pipe(
			tap(() =>
				logger.info(
					{
						method,
						url,
						duration: `${Date.now() - now}ms`,
					},
					"Request completed",
				),
			),
		);
	}
}
