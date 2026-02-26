/**
 * API Error class for standardized error handling.
 *
 * Usage:
 *   throw ApiError.unauthorized();
 *   throw ApiError.badRequest("Invalid email format");
 *   throw new ApiError(409, "Conflict", "Position code already exists");
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly messageJa?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static unauthorized(message = "Unauthorized", messageJa?: string): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message, messageJa);
  }

  static forbidden(
    message = "Forbidden",
    messageJa = "アクセスが拒否されました",
  ): ApiError {
    return new ApiError(403, "FORBIDDEN", message, messageJa);
  }

  static badRequest(message: string, messageJa?: string): ApiError {
    return new ApiError(400, "BAD_REQUEST", message, messageJa);
  }

  static notFound(
    message = "Not found",
    messageJa = "見つかりませんでした",
  ): ApiError {
    return new ApiError(404, "NOT_FOUND", message, messageJa);
  }

  static conflict(message: string, messageJa?: string): ApiError {
    return new ApiError(409, "CONFLICT", message, messageJa);
  }

  toJSON() {
    return {
      error: this.message,
      ...(this.messageJa && { errorJa: this.messageJa }),
    };
  }
}
