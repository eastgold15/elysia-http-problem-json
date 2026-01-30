// src/libs/elysia-http-problem-json/errors.ts

export interface ProblemDocument {
  type: string;
  title: string;
  status?: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

/**
 * RFC 9457 Problem Details Error Base Class
 *
 * Core members as per RFC 9457:
 * - type: A URI reference [RFC3986] that identifies the problem type.
 *         Defaults to "about:blank" when omitted.
 * - title: A short, human-readable summary of the problem type.
 * - status: The HTTP status code ([RFC7231], Section 6).
 * - detail: A human-readable explanation specific to this occurrence of the problem.
 * - instance: A URI reference that identifies the specific occurrence of the problem.
 *
 * Extension members: Additional properties can be added to provide more context.
 * These are serialized as-is in the JSON response.
 */
/**
 * RFC 9457 Error Base Class
 * * 修改思路：直接使用 public readonly 属性，拒绝嵌套，拒绝 Getter。
 */
export class ProblemError extends Error {
  // 1. 直接声明公开属性
  public readonly status: number;
  public readonly title: string;
  public readonly type: string;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly extensions?: Record<string, unknown>;

  constructor(
    type = "about:blank",
    title: string,
    status: number,
    detail?: string,
    instance?: string,
    extensions: Record<string, unknown> = {}
  ) {
    super(detail || title);
    Object.setPrototypeOf(this, ProblemError.prototype);

    // 2. 直接赋值给 this
    this.status = status;
    this.title = title;
    this.type = type;
    this.detail = detail;
    this.instance = instance;
    this.extensions = extensions;
  }

  // 3. toJSON 的时候动态组装一下即可
  toJSON(): ProblemDocument {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      ...(this.detail ? { detail: this.detail } : {}),
      ...(this.instance ? { instance: this.instance } : {}),
      // 把扩展字段展开 (extensions)
      ...this.extensions,
    };
  }
}

// --- 40X Errors ---
class BadRequest extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/400",
      "Bad Request",
      400,
      detail,
      undefined,
      extensions
    );
  }
}

class Unauthorized extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/401",
      "Unauthorized",
      401,
      detail,
      undefined,
      extensions
    );
  }
}

class Forbidden extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/403",
      "Forbidden",
      403,
      detail,
      undefined,
      extensions
    );
  }
}

class NotFound extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/404",
      "Not Found",
      404,
      detail,
      undefined,
      extensions
    );
  }
}

class Conflict extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/409",
      "Conflict",
      409,
      detail,
      undefined,
      extensions
    );
  }
}

class PaymentRequired extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/402",
      "Payment Required",
      402,
      detail,
      undefined,
      extensions
    );
  }
}

class MethodNotAllowed extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/405",
      "Method Not Allowed",
      405,
      detail,
      undefined,
      extensions
    );
  }
}

class NotAcceptable extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/406",
      "Not Acceptable",
      406,
      detail,
      undefined,
      extensions
    );
  }
}

// 50X Errors
class InternalServerError extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/500",
      "Internal Server Error",
      500,
      detail,
      undefined,
      extensions
    );
  }
}

class NotImplemented extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/501",
      "Not Implemented",
      501,
      detail,
      undefined,
      extensions
    );
  }
}

class BadGateway extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/502",
      "Bad Gateway",
      502,
      detail,
      undefined,
      extensions
    );
  }
}

class ServiceUnavailable extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/503",
      "Service Unavailable",
      503,
      detail,
      undefined,
      extensions
    );
  }
}

class GatewayTimeout extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/504",
      "Gateway Timeout",
      504,
      detail,
      undefined,
      extensions
    );
  }
}

export const HttpError = {
  BadRequest,
  Unauthorized,
  PaymentRequired,
  Forbidden,
  NotFound,
  MethodNotAllowed,
  NotAcceptable,
  Conflict,
  InternalServerError,
  NotImplemented,
  BadGateway,
  ServiceUnavailable,
  GatewayTimeout,
} as const;
