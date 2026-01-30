# @pori15/elysia-unified-error

A unified error handling plugin for Elysia that converts errors into **RFC 9457** Problem Details JSON responses with beautiful console logging and database error mapping support.

## 特性

- **RFC 9457 标准响应** - 自动转换为 Problem Details JSON 格式
- **漂亮的控制台日志** - 分盒式设计，可点击跳转（VS Code）
- **数据库错误映射** - 自动将 PostgreSQL 错误码转换为 HTTP 错误
- **自定义错误支持** - 完整的 HttpError 类集合
- **扩展字段支持** - 可添加自定义字段到错误响应

## 安装

```bash
bun add @pori15/elysia-unified-error
```

## 快速开始

```typescript
import { Elysia } from "elysia";
import { unifiedErrorPlugin, HttpError } from "@pori15/elysia-unified-error";

const app = new Elysia()
  .use(unifiedErrorPlugin())
  .get("/user/:id", ({ params }) => {
    const user = db.findUser(params.id);
    if (!user) throw new HttpError.NotFound("User not found");
    return user;
  })
  .listen(3000);
```

**错误响应格式：**
```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "User not found",
  "instance": "/user/123"
}
```

## 完整配置示例

```typescript
import { Elysia } from "elysia";
import {
  unifiedErrorPlugin,
  HttpError,
  isDatabaseError,
  mapDatabaseError,
  logErrorWithConsola
} from "@pori15/elysia-unified-error";

const app = new Elysia()
  .use(unifiedErrorPlugin({
    // 自定义错误转换
    transform: (error) => {
      if (isDatabaseError(error)) {
        return mapDatabaseError(error);
      }
      return null;
    },

    // 响应前的钩子（用于日志记录）
    onBeforeRespond: (problem, ctx) => {
      if (process.env.NODE_ENV === "development") {
        logErrorWithConsola(problem, ctx);
      }
    },

    // 自定义 type URL 前缀
    typeBaseUrl: "https://api.example.com/errors"
  }))
  .listen(3000);
```

## 可用错误类型

### 4xx 客户端错误

| 错误类 | 状态码 | 说明 |
|--------|--------|------|
| `HttpError.BadRequest` | 400 | 错误的请求 |
| `HttpError.Unauthorized` | 401 | 未授权 |
| `HttpError.PaymentRequired` | 402 | 需要付款 |
| `HttpError.Forbidden` | 403 | 禁止访问 |
| `HttpError.NotFound` | 404 | 未找到 |
| `HttpError.MethodNotAllowed` | 405 | 方法不允许 |
| `HttpError.NotAcceptable` | 406 | 不可接受 |
| `HttpError.Conflict` | 409 | 冲突 |

### 5xx 服务器错误

| 错误类 | 状态码 | 说明 |
|--------|--------|------|
| `HttpError.InternalServerError` | 500 | 内部服务器错误 |
| `HttpError.NotImplemented` | 501 | 未实现 |
| `HttpError.BadGateway` | 502 | 坏网关 |
| `HttpError.ServiceUnavailable` | 503 | 服务不可用 |
| `HttpError.GatewayTimeout` | 504 | 网关超时 |

## 使用扩展字段

所有错误类型都支持 `extensions` 参数来添加自定义字段：

```typescript
throw new HttpError.BadRequest("Validation failed", {
  errors: [
    { path: "/email", message: "Invalid email format", value: "invalid" },
    { path: "/age", message: "Must be at least 18", value: 15 }
  ]
});
```

**响应：**
```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed",
  "errors": [
    { "path": "/email", "message": "Invalid email format", "value": "invalid" },
    { "path": "/age", "message": "Must be at least 18", "value": 15 }
  ]
}
```

## 数据库错误映射

自动将 PostgreSQL 错误码映射为 HTTP 错误：

```typescript
// UNIQUE 约束违反 (23505) → 409 Conflict
// FOREIGN KEY 约束违反 (23503) → 400 Bad Request
// NOT NULL 约束违反 (23502) → 400 Bad Request
```

## 日志输出

开发环境下会自动输出漂亮的错误日志：

```
┌─────────────────────────────────────────────┐
│ [HTTP 500] GET /api/users                   │
│                                             │
│ Internal Server Error                       │
│                                             │
│ Stack:                                      │
│   getUser src/index.ts:123                  │
│           ^^^^^^^^^^^^^^^ 可点击             │
└─────────────────────────────────────────────┘
```

- 盒式设计，边界框根据状态码着色
- 相对路径显示，可点击跳转到对应行号
- 自动过滤 node_modules 和插件本身的堆栈

## 自动错误处理

插件会自动处理以下 Elysia 内置错误：

| 错误码 | 映射 |
|--------|------|
| `VALIDATION` | 400 Bad Request（带验证详情）|
| `NOT_FOUND` | 404 Not Found |
| `PARSE` | 400 Bad Request |
| `INVALID_COOKIE_SIGNATURE` | 400 Bad Request |

## API 参考

### `unifiedErrorPlugin(options?)`

创建统一错误处理插件。

**选项：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `transform` | `(error, ctx) => ProblemError \| null` | - | 自定义错误转换函数 |
| `onBeforeRespond` | `(problem, ctx) => void` | - | 响应前的回调（日志等）|
| `typeBaseUrl` | `string` | - | 自定义 type URL 前缀 |

### `isDatabaseError(error)`

检查错误是否为数据库错误。

### `mapDatabaseError(error)`

将数据库错误映射为对应的 HttpError。

### `logErrorWithConsola(problem, ctx)`

打印漂亮的错误日志到控制台。

## 示例项目

查看 `example/` 目录获取完整示例：

```bash
cd example
bun run dev
```

测试端点：
- `/ok` - 正常响应
- `/not-found` - 404 错误
- `/bad-request` - 400 错误
- `/validation-error` - 验证错误
- `/db-unique-violation` - 数据库唯一约束冲突
- `/db-foreign-key-violation` - 外键约束冲突

## License

MIT
