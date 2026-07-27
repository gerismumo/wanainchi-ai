export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    details?: unknown;
}

export function createSuccessResponse<T>(
    data: T,
    message = "ok",
    statusCode = 200
): ApiResponse<T> {
    return {
        success: true,
        statusCode,
        message: message.toLowerCase(),
        data,
    };
}

export function createErrorResponse({
    message,
    statusCode = 500,
}: {
    message: string;
    statusCode?: number;
}): ApiResponse<null> {
    return {
        success: false,
        statusCode,
        message: message.toLowerCase(),
    };
}