# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个用于 Elysia 框架的 HTTP Problem JSON (RFC 7807) 插件库，将各种错误自动转换为标准的 Problem Details JSON 响应。

## Common Commands

```bash
# 使用 bun 运行测试
bun test

# 构建项目
bun run build

# 代码检查和格式化（使用 Biome）
bun run lint

# 发布前检查（测试 + 类型检查）
bun run prepublishOnly
```

**重要**: 此项目使用 **bun** 作为包管理器和运行时，不要使用 npm 或 pnpm。

## Architecture

### 核心文件结构

- `src/index.ts` - 主入口文件，导出 `httpProblemJsonPlugin` 插件
- `src/errors.ts` - 所有错误类定义，包括 `ProblemError` 基类和 `HttpError` 对象

### 插件工作原理

1. **插件注册** (`src/index.ts:6-9`)
   - 创建一个名为 `elysia-http-problem-json` 的 Elysia 插件
   - 注册自定义错误类型 `PROBLEM_ERROR`

2. **全局错误处理** (`src/index.ts:9-55`)
   - 使用 `.onError({ as: 'global' })` 捕获所有错误
   - 根据错误代码 (`code`) 分类处理:
     - `PROBLEM_ERROR` - 自定义 HttpError
     - `VALIDATION` - Elysia 验证错误
     - `NOT_FOUND` - 404 路由未找到
     - `PARSE` - 请求解析错误
     - `INVALID_COOKIE_SIGNATURE` - Cookie 签名无效
     - `INVALID_FILE_TYPE` - 文件类型无效
     - 默认 - 内部服务器错误

### 错误类设计

**`ProblemError` 基类** (`src/errors.ts:1-32`)
- 包含 RFC 7807 标准字段: `type`, `title`, `status`, `detail`, `instance`
- `toJSON()` 方法序列化为标准响应格式

**`HttpError` 对象** (`src/errors.ts:128-142`)
- 导出所有 HTTP 错误类的命名空间对象
- 包含 40X 和 50X 系列错误

**特殊错误**:
- `BadRequest` 支持额外的 `extensions` 字段，用于添加验证错误详情

### Eden 类型安全支持

项目包含 `@elysiajs/eden` 作为开发依赖，用于类型安全的客户端生成。测试文件 `__tests__/eden.spec.ts` 验证 Eden 兼容性。

## Development Notes

- 使用 **Biome** 进行代码检查和格式化（配置在 `biome.json`）
- **Husky** 用于 Git hooks（通过 `prepare` 脚本自动安装）
- TypeScript 编译目标为 ESNext，输出到 `dist/` 目录
- 构建时 external `elysia` 依赖（由使用者提供）
- 有一个待修复的 TODO: `src/index.ts:14` - Elysia 的 `error.all` 可能存在 bug，目前使用 `JSON.parse(error.message)` 作为临时解决方案
