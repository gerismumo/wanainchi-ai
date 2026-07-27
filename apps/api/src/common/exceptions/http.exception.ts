import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { isDatabaseError } from './database.exeptions';
import { toCamelCase } from '../util/case.util';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    console.log('newex', exception);

    if (isDatabaseError(exception)) {
      this.logger.error(
        `Database error: ${exception.message} | URL: ${req.method} ${req.url}`,
        exception.stack,
      );

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const resMessage = (response as any).message;
        if (Array.isArray(resMessage)) {
          message = resMessage.join(', ');
        } else {
          message = resMessage || 'An error occurred';
        }
      } else {
        message = 'An error occurred';
      }

      this.logger.warn(
        `[HTTP ${status}] ${message} | URL: ${req.method} ${req.url}`,
      );
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.issues

        .map((issue) => {
          const path = issue.path.join('.');

          return path
            ? `${issue.message} (${toCamelCase(path.trim())})`
            : issue.message;
        })
        .join(', ');

      this.logger.warn(
        `Zod validation failed: ${message} | URL: ${req.method} ${req.url}`,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception?.message || 'Internal server error';

      this.logger.error(
        `Unexpected error: ${message} | URL: ${req.method} ${req.url}`,
        (exception as any)?.stack,
      );
    }

    return res.status(status).json({
      success: false,
      statusCode: status,
      message,
    });
  }
}
