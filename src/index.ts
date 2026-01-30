import { Elysia, status } from "elysia";
import { HttpError, ProblemError } from "./errors";

export * from "./errors";

/**
 * Configuration options for the HTTP Problem JSON plugin.
 */
export interface HttpProblemJsonOptions {
  /**
   * Base URL for error type URIs.
   * When provided, error types will be constructed as: `{typeBaseUrl}/{status}`
   * Example: "https://api.example.com/errors" -> "https://api.example.com/errors/404"
   *
   * @default undefined - uses httpstatuses.com URLs
   */
  typeBaseUrl?: string;
}

/**
 * HTTP Problem JSON Plugin for Elysia
 *
 * Fully compliant with RFC 9457 (formerly RFC 7807).
 *
 * Features:
 * - Converts all errors to RFC 9457 Problem Details JSON format
 * - Sets proper Content-Type: application/problem+json header
 * - Supports custom type base URL configuration
 * - Handles all Elysia built-in error types
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia'
 * import { httpProblemJsonPlugin } from 'elysia-http-problem-json'
 *
 * const app = new Elysia()
 *   .use(httpProblemJsonPlugin({
 *     typeBaseUrl: 'https://api.example.com/errors'
 *   }))
 * ```
 */
export function httpProblemJsonPlugin(options?: HttpProblemJsonOptions) {
  return new Elysia({ name: "elysia-http-problem-json" })
    .error({ PROBLEM_ERROR: ProblemError })
    .onError({ as: "global" }, ({ code, error, path, set }) => {
      let problem: ProblemError;
      switch (code) {
        case "PROBLEM_ERROR": {
          problem = error as ProblemError;
          break;
          // // Apply custom typeBaseUrl if configured
          // if (options?.typeBaseUrl && problemJson.type.startsWith("https://httpstatuses.com/")) {
          //   const status = problemJson.status;
          //   problemJson.type = `${options.typeBaseUrl}/${status}`;
          // }
          // return status(error.status, problemJson);
        }
        case "VALIDATION": {
          // TODO - figure out why error.all throws an error - feels like an elysia bug
          problem = new HttpError.BadRequest("Validation Failed", {
            errors: error.all?.map((e: any) => ({
              path: e.path,
              message: e.message,
              value: e.value,
            })),
          });
          break;
        }
        case "NOT_FOUND": {
          problem = new HttpError.NotFound(
            `The requested resource ${path} was not found`,
          );
          break;
        }
        case "PARSE": {
          problem = new HttpError.BadRequest(
            `The request could not be parsed: ${error.message}`,
          );
          break;
        }
        case "INVALID_COOKIE_SIGNATURE": {
          problem = new HttpError.BadRequest(
            "The provided cookie signature is invalid",
            { key: error.key },
          );
          break;
        }
        case "INVALID_FILE_TYPE": {
          problem = new HttpError.BadRequest(error.message, {
            property: error.property,
            expected: error.expected,
          });
          break;
        }
        default: {
          const message =
            error instanceof Error ? error.message : String(error);
          problem = new HttpError.InternalServerError(message);
          break;
        }
      }
      const json = problem.toJSON();
      json.instance = path;

      if (
        options?.typeBaseUrl &&
        (json.type === "about:blank" || json.type.includes("httpstatuses.com"))
      ) {
        json.type = `${options.typeBaseUrl}/${json.status}`;
      }

      return new Response(JSON.stringify(json), {
        status: json.status,
        headers: {
          ...(set.headers as Record<string, string>),
          "Content-Type": "application/problem+json; charset=utf-8",
        },
      });
    });
}
