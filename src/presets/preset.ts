/**
 * Standard Error Suite Preset
 *
 * 🏭 工厂标准错误处理套件
 *
 * 这是一个开箱即用的错误处理预设，包含：
 * 1. RFC 9457 标准 Problem Details JSON 响应
 * 2. 数据库错误自动识别和转换 (Drizzle/Postgres)
 * 3. 开发环境美化的控制台日志 (Consola)
 *
 * @module
 */

import { unifiedErrorPlugin } from "../core";
import { isDatabaseError } from "./hooks/db/guards";
import { mapDatabaseError } from "./hooks/db/mapper";
import { logErrorWithConsola } from "./hooks/logger/console";

export type { DrizzleError } from "./hooks/db/guards";
export * from "./hooks/logger/console";
/**
 * 配置选项
 */
export interface StandardErrorSuiteOptions {
  /**
   * 错误类型的 Base URL
   * @example "https://api.example.com/errors" -> "https://api.example.com/errors/404"
   */
  typeBaseUrl?: string;

  /**
   * 是否启用控制台日志
   * @default process.env.NODE_ENV !== "production" (仅开发环境启用)
   */
  logging?: boolean;

  /**
   * 强制开启日志 (即使在生产环境)
   * @default false
   */
  forceLogging?: boolean;

  /**
   * 是否在日志中包含堆栈信息
   * @default true
   */
  includeStack?: boolean;
}

/**
 * 🏭 Standard Factory Error Suite
 *
 * @param options - 配置选项
 * @returns Elysia plugin instance
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia'
 * import { standardErrorSuite } from './framework/error-system/preset'
 *
 * const app = new Elysia()
 * .use(standardErrorSuite())
 * .listen(3000)
 * ```
 */
export const standardErrorSuite = (options: StandardErrorSuiteOptions = {}) => {
  // 1. 设置默认值
  const {
    typeBaseUrl,
    logging = process.env.NODE_ENV !== "production",
    forceLogging = false,
  } = options;

  // 2. 调用核心插件
  return unifiedErrorPlugin({
    typeBaseUrl,

    // 🔗 钩子 1: 转换逻辑 (Transform Hook)
    // 负责识别特定领域的错误（如数据库错误）并将其转换为标准 HttpError
    transform: (error, ctx) => {
      // 自动识别 Drizzle/Postgres 错误
      if (isDatabaseError(error)) {
        return mapDatabaseError(error);
      }

      // 返回 null 表示："我不认识这个错误，请走默认处理流程"
      return null;
    },

    // 🔗 钩子 2: 监听逻辑 (Listen Hook)
    // 负责副作用，如日志打印、监控上报
    onBeforeRespond: (problem, ctx) => {
      // 判断开关
      if (logging || forceLogging) {
        logErrorWithConsola(problem, ctx);
      }
    },
  });
};

/**
 * 导出原子钩子，允许高级用户手动组装
 */
export { isDatabaseError } from "./hooks/db/guards";
export { mapDatabaseError } from "./hooks/db/mapper";
export { logErrorWithConsola } from "./hooks/logger/console";
