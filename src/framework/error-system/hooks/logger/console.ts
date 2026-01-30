import { consola } from "consola";
import type { ProblemError } from "../../../../libs/elysia-http-problem-json";
import type { ErrorContext } from "../../../../libs/elysia-http-problem-json/types";
import { isDatabaseError, getPostgresError } from "../db/guards";

import { colors } from "consola/utils";
// 创建一个带有 HTTP 标签的专用 logger
const logger = consola.create({
  defaults: {
    tag: "HTTP",
  },
});

/**
 * 使用 Consola 打印漂亮的错误日志
 */
export function logErrorWithConsola(
  problem: ProblemError,
  ctx: ErrorContext
) {
  // 1. 仅在开发环境或需要详细日志时打印
  if (process.env.NODE_ENV !== "development") return;

  const { request, path, error } = ctx;
  const method = request.method;
  const status = problem.status;

  // 2. 根据状态码选择日志级别和样式
  const isServerErr = status >= 500;
  const logFn = isServerErr ? logger.error : logger.warn;

  // --- 打印标题行 ---
  // 格式: [HTTP] GET /api/users [404 Not Found]
  logFn(
    `${method} ${path} [${status} ${problem.title}]`
  );

  // --- 打印错误详情 ---
  // 如果有 message 且不等于 title，打印出来
  if (problem.detail && problem.detail !== problem.title) {
    consola.log(`   ${problem.detail}`); // 缩进一下更好看
  }

  // --- 3. 数据库错误特殊处理 (显示 SQL) ---
  if (isDatabaseError(error)) {
    const pgErr = getPostgresError(error);
    consola.box({
      title: `Database Error (${pgErr.code})`,
      message: [
        pgErr.message,
        "",
        `Query:  ${error.query}`,
        `Params: ${JSON.stringify(error.params)}`
      ].join("\n"),
      style: { borderColor: "red" }
    });
  }
  // --- 4. 普通代码错误 (显示堆栈) ---
  else if (error instanceof Error && error.stack) {
    const stackLines = error.stack
      .split("\n")
      .filter((line) => !line.includes("node_modules") && !line.includes("elysia-http-problem-json"))
      .slice(0, 5);

    if (stackLines.length > 0) {
      // 👇 修改这里
      consola.log(colors.gray(stackLines.join("\n")));
    }
  }
}