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
export class ProblemError extends Error {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  // RFC 9457 extension members - allows additional custom fields
  [key: string]: any;

  constructor(
    type = "about:blank",
    title: string,
    status: number,
    detail?: string,
    instance?: string,
    extensions?: Record<string, any>,
  ) {
    super(detail || title);
    Object.setPrototypeOf(this, ProblemError.prototype);
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;

    // Copy extension members to the error instance
    if (extensions) {
      Object.assign(this, extensions);
    }
  }
  toJSON(): Record<string, any> {
    const {
      type,
      title,
      status,
      detail,
      instance,
      name,
      stack,
      message,
      ...extensions
    } = this;
    const result: Record<string, any> = {
      type,
      title,
      status,
      ...(detail && { detail }),
      ...(instance && { instance }),
    };
    return { ...result, ...extensions };
  }
}

// 40X Errors
class BadRequest extends ProblemError {
  constructor(detail?: string, extensions?: Record<string, any>) {
    super(
      "https://httpstatuses.com/400",
      "Bad Request",
      400,
      detail,
      undefined,
      extensions,
    );
  }
}

class Unauthorized extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/401", "Unauthorized", 401, detail);
  }
}

class PaymentRequired extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/402", "Payment Required", 402, detail);
  }
}

class Forbidden extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/403", "Forbidden", 403, detail);
  }
}

class NotFound extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/404", "Not Found", 404, detail);
  }
}

class MethodNotAllowed extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/405", "Method Not Allowed", 405, detail);
  }
}

class NotAcceptable extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/406", "Not Acceptable", 406, detail);
  }
}

class Conflict extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/409", "Conflict", 409, detail);
  }
}

// 50X Errors
class InternalServerError extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/500", "Internal Server Error", 500, detail);
  }
}

class NotImplemented extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/501", "Not Implemented", 501, detail);
  }
}

class BadGateway extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/502", "Bad Gateway", 502, detail);
  }
}

class ServiceUnavailable extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/503", "Service Unavailable", 503, detail);
  }
}

class GatewayTimeout extends ProblemError {
  constructor(detail?: string) {
    super("https://httpstatuses.com/504", "Gateway Timeout", 504, detail);
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
