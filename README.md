# elysia-http-problem-json

A simple plugin for Elysia that turns errors into **RFC 9457** Problem Details JSON responses.

## Install

```bash
bun add elysia-http-problem-json
```

## Quick Start

```typescript
import { Elysia, t } from 'elysia'
import { httpProblemJsonPlugin, HttpError } from 'elysia-http-problem-json'

const app = new Elysia()
  .use(httpProblemJsonPlugin())
  .get('/user/:id', ({ params }) => {
    const user = db.findUser(params.id)
    if (!user) throw new HttpError.NotFound('User not found')
    return user
  })
  .post('/user', ({ body }) => {
    return createUser(body)
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      age: t.Number({ minimum: 18 })
    })
  })
  .listen(3000)
```

**Returns [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) Problem Details:**
```json
{
  "type": "https://httpstatuses.com/404",
  "title": "Not Found",
  "status": 404,
  "detail": "User not found"
}
```

## Features

- **Auto-converts Elysia errors** – ValidationError, NotFoundError, InvalidCookieSignature, and more
- **Throw custom errors** – Clean HttpError classes for all common status codes
- **RFC 9457 compliant** – Standard Problem Details JSON format with proper Content-Type header
- **Extensions supported** – Add custom fields to error responses
- **Custom error type URLs** – Configure base URL for error documentation links

## Configuration

### Basic Usage

```typescript
import { Elysia } from 'elysia'
import { httpProblemJsonPlugin } from 'elysia-http-problem-json'

const app = new Elysia()
  .use(httpProblemJsonPlugin())
  .get('/user/:id', ({ params }) => {
    const user = db.findUser(params.id)
    if (!user) throw new HttpError.NotFound('User not found')
    return user
  })
```

### Custom Type Base URL

Configure a custom base URL for error type URIs:

```typescript
const app = new Elysia()
  .use(httpProblemJsonPlugin({
    typeBaseUrl: 'https://api.example.com/errors'
  }))
  .get('/user/:id', () => {
    throw new HttpError.NotFound('User not found')
  })

// Response will include:
// {
//   "type": "https://api.example.com/errors/404",
//   "title": "Not Found",
//   "status": 404,
//   "detail": "User not found"
// }
```

## Available Error Types

- BadRequest (400)
- Unauthorized (401)
- PaymentRequired (402)
- Forbidden (403)
- NotFound (404)
- MethodNotAllowed (405)
- NotAcceptable (406)
- Conflict (409)
- InternalServerError (500)
- NotImplemented (501)
- BadGateway (502)
- ServiceUnavailable (503)
- GatewayTimeout (504)

## Using Extensions

All error types support an optional `extensions` parameter to add custom fields to your error responses. This is useful for providing additional context that helps clients handle errors more effectively.

### Basic Usage

```typescript
throw new HttpError.BadRequest('Invalid input', {
  field: 'email',
  code: 'INVALID_FORMAT'
})

// Response:
// {
//   "type": "https://httpstatuses.com/400",
//   "title": "Bad Request",
//   "status": 400,
//   "detail": "Invalid input",
//   "field": "email",
//   "code": "INVALID_FORMAT"
// }
```

### Common Use Cases

**Validation Errors (400):**
```typescript
throw new HttpError.BadRequest('Validation failed', {
  errors: [
    { field: 'email', message: 'Invalid email format' },
    { field: 'age', message: 'Must be at least 18' }
  ]
})
```

**Authentication (401):**
```typescript
throw new HttpError.Unauthorized('Authentication required', {
  authType: 'Bearer',
  realm: 'api.example.com'
})
```

**Forbidden (403):**
```typescript
throw new HttpError.Forbidden('Insufficient permissions', {
  required: ['admin', 'write'],
  current: ['read'],
  requestUrl: '/permissions/request'
})
```

**Not Found (404):**
```typescript
throw new HttpError.NotFound('User not found', {
  userId: '12345',
  suggestedIds: ['12346', '12347']
})
```

**Conflict (409):**
```typescript
throw new HttpError.Conflict('Email already exists', {
  conflictingEmail: 'user@example.com',
  existingUserId: 'abc123'
})
```

**Internal Server Error (500):**
```typescript
throw new HttpError.InternalServerError('Database connection failed', {
  code: 'DB_CONNECTION_ERROR',
  requestId: 'req_abc123',
  retryable: true
})
```

**Service Unavailable (503):**
```typescript
throw new HttpError.ServiceUnavailable('Maintenance in progress', {
  retryAfter: 3600,
  maintenanceWindow: '02:00-04:00 UTC'
})
```

**Gateway Timeout (504):**
```typescript
throw new HttpError.GatewayTimeout('Upstream service timeout', {
  upstreamService: 'payment-api',
  timeout: '30s'
})
```

## Response Examples

**Validation Error (400):**
```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "The request is invalid",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["age"],
      "message": "Invalid input"
    }
  ]
}
```

**Internal Server Error (500):**
```json
{
  "type": "https://httpstatuses.com/500",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "Database connection failed"
}
```

## RFC 9457 Compliance

This plugin is fully compliant with [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html) (formerly RFC 7807):

- **Proper Content-Type**: All error responses use `application/problem+json` as specified in Section 6
- **Core members**: Includes all standard fields (type, title, status, detail, instance)
- **Extension members**: Supports custom fields while preventing conflicts with standard fields
- **Type URI defaults**: When type is omitted, defaults to "about:blank" per the specification
- **Absolute URI support**: Encourages using absolute URIs for type references to error documentation

## License

MIT



```
src/
├── libs/
│   └── elysia-http-problem-json/  <-- [核心插件] 纯净、无业务依赖、通用
│       ├── index.ts               # 插件入口
│       ├── types.ts               # 类型定义 (Hooks, Options)
│       └── errors.ts              # HttpError, ProblemError 基类
│
├── framework/
│   └── error-system/              <-- [业务层] 具体的实现逻辑
│       ├── hooks/
│       │   ├── db/                # [数据库钩子]
│       │   │   ├── guards.ts      # 类型守卫 (isDatabaseError)
│       │   │   └── mapper.ts      # 错误映射 (Code -> HttpError)
│       │   └── logger/            # [日志钩子]
│       │       └── console.ts     # Chalk 美化打印
│       │
│       └── preset.ts              # [预设封装] 组装插件和钩子，导出 standardErrorSuite
│
└── ... (业务代码)
```