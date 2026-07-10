import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  errors?: ValidationError[];
  meta?: ResponseMeta;
  timestamp: string;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
  requestId?: string;
  version?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Generate request ID for tracking
const generateRequestId = (): string => randomUUID();

// Helper to handle response format for both Express and Fastify
const handleHttpResponse = (res: any, statusCode: number, payload: any) => {
  if (res && typeof res.status === 'function') {
    if (typeof res.send === 'function') {
      return res.status(statusCode).send(payload);
    } else if (typeof res.json === 'function') {
      return res.status(statusCode).json(payload);
    }
  }
  return null;
};

// Base response function
const sendResponse = <T>(
  res: any,
  success: boolean,
  statusCode: number,
  message: string,
  data?: T,
  errors?: any[],
  meta?: ResponseMeta
): any => {
  const response: ApiResponse<T> = {
    success,
    statusCode,
    message,
    data,
    errors,
    meta: {
      ...meta,
      requestId: meta?.requestId || generateRequestId(),
      version: process.env.API_VERSION || '1.0.0'
    },
    timestamp: new Date().toISOString()
  };

  const handled = handleHttpResponse(res, statusCode, response);
  if (handled !== null) {
    return handled;
  }

  // If res is not provided (or doesn't support response methods),
  // we either return the payload directly (for success) or throw HttpException (for errors)
  if (success) {
    return response;
  } else {
    throw new HttpException(response, statusCode);
  }
};

// Success Responses
export const successResponse = <T>(
  res: any,
  message: string,
  data?: T,
  meta?: ResponseMeta
): any => {
  return sendResponse(res, true, HttpStatus.OK, message, data, undefined, meta);
};

export const createdResponse = <T>(
  res: any,
  message: string,
  data?: T,
  meta?: ResponseMeta
): any => {
  return sendResponse(res, true, HttpStatus.CREATED, message, data, undefined, meta);
};

export const noContentResponse = (
  res: any,
  message: string = 'No content',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, true, HttpStatus.NO_CONTENT, message, undefined, undefined, meta);
};

// Error Responses
export const errorResponse = (
  res: any,
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST,
  errors?: any[],
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, statusCode, message, undefined, errors, meta);
};

export const validationErrorResponse = (
  res: any,
  message: string,
  errors?: any[],
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.UNPROCESSABLE_ENTITY, message, undefined, errors, meta);
};

export const unauthorizedResponse = (
  res: any,
  message: string = 'Unauthorized access',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.UNAUTHORIZED, message, undefined, undefined, meta);
};

export const forbiddenResponse = (
  res: any,
  message: string = 'Access forbidden',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.FORBIDDEN, message, undefined, undefined, meta);
};

export const notFoundResponse = (
  res: any,
  message: string = 'Resource not found',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.NOT_FOUND, message, undefined, undefined, meta);
};

export const conflictResponse = (
  res: any,
  message: string = 'Resource conflict',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.CONFLICT, message, undefined, undefined, meta);
};

export const internalServerErrorResponse = (
  res: any,
  message: string = 'Internal server error',
  meta?: ResponseMeta
): any => {
  return sendResponse(res, false, HttpStatus.INTERNAL_SERVER_ERROR, message, undefined, undefined, meta);
};

// Pagination Helper
export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Paginated Response
export const paginatedResponse = <T>(
  res: any,
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number,
  meta?: Omit<ResponseMeta, 'pagination'>
): any => {
  const paginationMeta = createPaginationMeta(page, limit, total);
  const responseMeta: ResponseMeta = {
    ...meta,
    pagination: paginationMeta
  };

  return successResponse(res, message, data, responseMeta);
};

// Response with Custom Status
export const customResponse = <T>(
  res: any,
  success: boolean,
  statusCode: number,
  message: string,
  data?: T,
  errors?: any[],
  meta?: ResponseMeta
): any => {
  return sendResponse(res, success, statusCode, message, data, errors, meta);
};

// Legacy compatibility functions
export const successResponseWithData = <T>(
  res: any,
  message: string,
  data: T,
  meta?: ResponseMeta
): any => {
  return successResponse(res, message, data, meta);
};

export const errorResponseWithData = <T>(
  res: any,
  message: string,
  data?: any,
  statusCode: number = HttpStatus.BAD_REQUEST,
  meta?: ResponseMeta
): any => {
  return errorResponse(res, message, statusCode, data ? [data] : undefined, meta);
};

export const validationError = (
  res: any,
  message: string,
  errors?: any[],
  meta?: ResponseMeta
): any => {
  return validationErrorResponse(res, message, errors, meta);
};
