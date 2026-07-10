import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, from } from "rxjs";
import { switchMap } from "rxjs/operators";
import { UploadsService } from "../../modules/uploads/uploads.service";

@Injectable()
export class MultipartInterceptor implements NestInterceptor {
  constructor(private readonly uploadsService: UploadsService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    // handleMultipart returns a Promise, we convert it to an observable using from()
    return from(this.uploadsService.handleMultipart(req)).pipe(
      switchMap(() => next.handle()),
    );
  }
}
