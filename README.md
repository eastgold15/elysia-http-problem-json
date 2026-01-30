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
