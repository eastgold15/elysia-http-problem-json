import { consola } from "consola";
import { colors } from "consola/utils";
import { ErrorContext } from "../../../core/types";
import { ProblemError } from "../../../core/errors";
import { getPostgresError, isDatabaseError } from "../db/guards";

// 状态码颜色映射
function getStatusColor(status: number): (str: string) => string {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.blue;
  if (status >= 200) return colors.green;
  return colors.gray;
}

// HTTP 方法颜色
function getMethodColor(method: string): (str: string) => string {
  const colorsMap: Record<string, (str: string) => string> = {
    GET: colors.green,
    POST: colors.blue,
    PUT: colors.yellow,
    PATCH: colors.cyan,
    DELETE: colors.red,
  };
  return colorsMap[method] || colors.gray;
}

/**
 * 获取用于显示的相对路径（转换为正斜杠）
 */
function getDisplayPath(filePath: string): string {
  const cwd = process.cwd();
  let displayPath = filePath;

  if (filePath.toLowerCase().startsWith(cwd.toLowerCase())) {
    displayPath = filePath.slice(cwd.length).replace(/^\\+/, "") || filePath;
  }

  // 统一转换为正斜杠
  return displayPath.replace(/\\/g, "/");
}

/**
 * 创建可点击的文件链接
 * VS Code 会自动识别 路径:行号 格式
 */
function createFileLink(filePath: string, line: number): string {
  const displayPath = getDisplayPath(filePath);
  return `${displayPath}:${line}`;
}

// 解析堆栈行
function parseStackLine(line: string): { filePath: string; line: number; column: number; func: string } | null {
  // Windows: at functionName (C:\path\to\file.ts:123:45)
  const match = line.match(
    /at\s+(?:(.+?)\s+)?\((.+?):(\d+):(\d+)\)|at\s+(.+?):(\d+):(\d+)$/
  );

  if (!match) return null;

  const [, func, path1, line1, col1, path2, line2, col2] = match;

  return {
    filePath: path1 || path2 || "",
    line: parseInt(line1 || line2 || "0", 10),
    column: parseInt(col1 || col2 || "0", 10),
    func: func?.trim() || "",
  };
}

/**
 * 使用 Consola 打印漂亮的错误日志（统一分块框架风格 + 可点击堆栈）
 */
export function logErrorWithConsola(
  problem: ProblemError,
  ctx: ErrorContext
) {

  if (process.env.NODE_ENV === "production") return;

  const { request, path, error } = ctx;
  const method = request.method;
  const status = problem.status;
  const statusColor = getStatusColor(status);
  const methodColor = getMethodColor(method);

  // ==================== 数据库错误 ====================
  if (isDatabaseError(error)) {
    const pgErr = getPostgresError(error);

    // 解析调用栈
    let stackInfo = "";
    if (error instanceof Error && error.stack) {
      const lines = error.stack.split("\n").slice(1);
      for (const line of lines) {
        const parsed = parseStackLine(line);
        if (parsed) {
          const link = createFileLink(parsed.filePath, parsed.line);
          stackInfo = `\n${colors.dim("Called from: ")}${colors.cyan(link)}`;
          break;
        }
      }
    }

    consola.box({
      title: `${statusColor(`[HTTP ${status}]`)} ${methodColor(method)} ${path}`,
      message: [
        colors.red(`Database Error (${pgErr.code})`),
        "",
        colors.gray(pgErr.message),
        "",
        colors.dim("Query:   ") + colors.cyan(error.query || "N/A"),
        colors.dim("Params: ") + colors.yellow(JSON.stringify(error.params ?? "N/A")),
        stackInfo,
      ].filter(Boolean).join("\n"),
      style: { borderColor: "red" }
    });
    return;
  }

  // ==================== 验证错误 ====================
  if (problem.extensions?.errors) {
    const errors = problem.extensions.errors as Array<{
      path?: string;
      message: string;
      value?: unknown;
    }>;

    consola.box({
      title: `${statusColor(`[HTTP ${status}]`)} ${methodColor(method)} ${path}`,
      message: [
        colors.yellow("Validation Failed"),
        "",
        ...errors.map((err, idx) => [
          colors.red(`Field ${idx + 1}:`),
          colors.dim("  Path:   ") + colors.cyan(err.path || "N/A"),
          colors.dim("  Message:") + " " + colors.white(err.message),
          err.value !== undefined && colors.dim("  Value:   ") + colors.yellow(JSON.stringify(err.value)),
        ].filter(Boolean).join("\n"))
      ].join("\n"),
      style: { borderColor: status >= 500 ? "red" : "yellow" }
    });
    return;
  }

  // ==================== 普通 HTTP 错误 ====================
  const isServerError = status >= 500;
  const borderColor = isServerError ? "red" : "yellow";
  const titleColor = isServerError ? colors.red : colors.yellow;

  const messageLines: string[] = [
    titleColor(problem.title),
  ];

  // 添加 detail
  if (problem.detail && problem.detail !== problem.title) {
    messageLines.push("", colors.gray(problem.detail));
  }

  // 添加扩展字段（除了 errors）
  if (problem.extensions) {
    const otherExtensions = Object.entries(problem.extensions)
      .filter(([key]) => key !== "errors");

    if (otherExtensions.length > 0) {
      messageLines.push("");
      otherExtensions.forEach(([key, value]) => {
        messageLines.push(
          colors.dim(`${key}:`) + " " + colors.cyan(JSON.stringify(value))
        );
      });
    }
  }

  // 添加堆栈信息（仅服务器错误）
  if (isServerError && error instanceof Error && error.stack) {
    const stackLines = error.stack
      .split("\n")
      .slice(1)
      .filter((line) =>
        !line.includes("node_modules") &&
        !line.includes("elysia-http-problem-json")
      )
      .slice(0, 8);

    if (stackLines.length > 0) {
      const formattedStack = stackLines.map((line) => {
        const parsed = parseStackLine(line);
        if (!parsed) return colors.dim(`  ${line}`);

        const funcPart = parsed.func ? colors.dim(`${parsed.func} `) : "";
        const link = colors.cyan(createFileLink(parsed.filePath, parsed.line));

        return `  ${funcPart}${link}`;
      });

      messageLines.push("", colors.dim("Stack:"), ...formattedStack);
    }
  }

  consola.box({
    title: `${statusColor(`[HTTP ${status}]`)} ${methodColor(method)} ${path}`,
    message: messageLines.join("\n"),
    style: { borderColor }
  });
}
