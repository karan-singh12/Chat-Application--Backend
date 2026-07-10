import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { randomUUID } from "crypto";

export interface ResponseMeta {
  pagination?: any;
  requestId?: string;
  version?: string;
}

export interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta: ResponseMeta;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;

    // Fastify request object contains id, we fall back to randomUUID
    const requestId = request?.id || request?.headers?.["x-request-id"] || randomUUID();
    const apiVersion = process.env.API_VERSION || "1.0.0";

    return next.handle().pipe(
      map((data) => {
        const timestamp = new Date().toISOString();

        // If data is null/undefined, return standard layout
        if (!data) {
          return {
            success: true,
            statusCode,
            message: "Success",
            data: null as any,
            meta: {
              requestId,
              version: apiVersion,
            },
            timestamp,
          };
        }

        // If data already matches Response format, enrich it with meta and timestamp if missing
        if (typeof data === "object" && "success" in data && "statusCode" in data) {
          return {
            ...(data as any),
            meta: {
              requestId,
              version: apiVersion,
              ...((data as any).meta || {}),
            },
            timestamp: (data as any).timestamp || timestamp,
          };
        }

        // Extract customized message and data/meta if returned in that shape from the handler
        let message = "Success";
        let responseData = data;
        let customMeta: any = {};

        if (typeof data === "object" && data !== null) {
          if ("message" in data) {
            message = (data as any).message;
          }
          if ("data" in data) {
            responseData = (data as any).data;
          } else if ("message" in data) {
            // If only message is returned (no data property)
            responseData = null;
          }
          if ("meta" in data) {
            customMeta = (data as any).meta;
          }
        }

        return {
          success: true,
          statusCode,
          message,
          data: responseData,
          meta: {
            ...customMeta,
            requestId,
            version: apiVersion,
          },
          timestamp,
        };
      }),
    );
  }
}
