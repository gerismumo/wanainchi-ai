import { Response, Request, NextFunction } from 'express';
import { createErrorResponse, createSuccessResponse } from '../responses/api-responses';

export function responseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const defaultMessages: Record<string, string> = {
    POST: 'created successfully',
    GET: 'ok',
    PATCH: 'updated successfully',
    PUT: 'updated successfully',
    DELETE: 'deleted successfully',
  };

  res.success = function <T>(
    data: T,
    message?: string,
    statusCode?: number,
  ) {

    const finalMessage = message || defaultMessages[req.method] || 'success';

    const finalStatus =
      statusCode ||
      (req.method === 'POST' ? 201 : 200);

    return res
      .status(finalStatus)
      .json(createSuccessResponse(data, finalMessage, finalStatus));
  };

  res.fail = function (message: string, statusCode = 400) {
    return res
      .status(statusCode)
      .json(createErrorResponse({ message, statusCode }));
  };

  next();
}