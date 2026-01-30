import { type HttpError, ProblemError } from "./errors";

export interface ErrorContext {
  request: Request;
  path: string;
  code: string;
  error: unknown;
}

// 定义两个核心钩子
export interface HttpProblemJsonOptions {
  typeBaseUrl?: string;

  /** Hook 1: 转换 (Transform) - 负责将未知错误变为已知错误 */
  transform?: (error: unknown, context: ErrorContext) => HttpError | undefined | null;

  /** Hook 2: 监听 (Listen) - 负责日志和副作用 */
  onBeforeRespond?: (problem: ProblemError, context: ErrorContext) => void | Promise<void>;
}