// src/libs/elysia-http-problem-json/index.ts

import { Elysia } from "elysia";
import { HttpError, ProblemError } from "./errors";
import { ErrorContext, HttpProblemJsonOptions } from "./types";

export function unifiedErrorPlugin(options: HttpProblemJsonOptions = {}) {
  return new Elysia({ name: "elysia-http-problem-json" })
    .error({ PROBLEM_ERROR: ProblemError })
    .onError({ as: "global" }, ({ code, error, path, set, request }) => {
      const context: ErrorContext = { request, path, code, error };
      let problem: ProblemError | undefined | null;

      // =========================================================
      // Phase 1: User Transform Hook
      // =========================================================
      if (options.transform) {
        // 🚨 修正点：直接接收返回的 ProblemError
        const result = options.transform(error, context);
        if (result instanceof ProblemError) {
          problem = result;
        }
      }

      // =========================================================
      // Phase 2: Default Handling
      // =========================================================
      if (!problem) {
        // 如果已经是标准错误，直接用
        if (error instanceof ProblemError) {
          problem = error;
        }
        // 处理 Elysia 内置错误
        else {
          switch (code) {
            case "PROBLEM_ERROR":
              problem = error as ProblemError;
              break;
            case "VALIDATION":
              problem = new HttpError.BadRequest("Validation Failed", {
                errors: error.all?.map((e: any) => ({
                  path: e.path,
                  message: e.message,
                  value: e.value,
                })),
              });
              break;
            case "NOT_FOUND":
              problem = new HttpError.NotFound(`Resource not found: ${path}`);
              break;
            case "PARSE":
              problem = new HttpError.BadRequest(
                `Parse error: ${error.message}`
              );
              break;
            case "INVALID_COOKIE_SIGNATURE":
              problem = new HttpError.BadRequest("Invalid cookie signature", {
                key: (error as any).key,
              });
              break;
            default: {
              const message =
                error instanceof Error ? error.message : String(error);
              problem = new HttpError.InternalServerError(message);
              break;
            }
          }
        }
      }

      // =========================================================
      // Phase 3: Finalize JSON
      // =========================================================
      const json = problem.toJSON();
      json.instance = path;

      // 处理 typeBaseUrl
      if (
        options.typeBaseUrl &&
        (json.type === "about:blank" || json.type.includes("httpstatuses.com"))
      ) {
        json.type = `${options.typeBaseUrl}/${json.status}`;
      }

      // =========================================================
      // Phase 4: Listen Hook (Side Effects)
      // =========================================================
      if (options.onBeforeRespond) {
        // 触发副作用（日志等）
        void options.onBeforeRespond(problem, context);
      }

      // 设置状态码，让日志插件能正确记录
      set.status = json.status;

      // 返回 Response
      return new Response(JSON.stringify(json), {
        status: json.status,
        headers: {
          ...(set.headers as Record<string, string>),
          "Content-Type": "application/problem+json; charset=utf-8",
        },
      });
    });
}
