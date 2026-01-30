/**
 * Standard Error Suite 测试
 *
 * 测试 standardErrorSuite 插件的各种场景
 */

import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/libs/elysia-http-problem-json/errors";
import { standardErrorSuite } from "../src/framework/error-system/preset";

// Drizzle 错误类型
interface DrizzleError extends Error {
  cause: {
    code: string;
    message: string;
    constraint?: string;
    column?: string;
    detail?: string;
  };
  query?: string;
  params?: unknown[];
}

describe("standardErrorSuite", () => {
  let app: Elysia;
  let baseUrl: string;

  beforeAll(() => {
    app = new Elysia()
      .use(standardErrorSuite({
        typeBaseUrl: "https://api.example.com/errors",
        logging: false, // 测试时关闭日志
      }))
      .get("/ok", () => ({ message: "ok" }))
      .get("/not-found", () => {
        throw new HttpError.NotFound("Resource not found");
      })
      .get("/bad-request", () => {
        throw new HttpError.BadRequest("Invalid input");
      })
      .get("/unauthorized", () => {
        throw new HttpError.Unauthorized("Please login");
      })
      .get("/forbidden", () => {
        throw new HttpError.Forbidden("Access denied");
      })
      .get("/conflict", () => {
        throw new HttpError.Conflict("Resource already exists");
      })
      .get("/internal-error", () => {
        throw new HttpError.InternalServerError("Something went wrong");
      })
      .get("/custom-error", () => {
        throw new Error("Custom error");
      })
      .get("/validation-error", () => {
        // 模拟 Elysia 验证错误
        const error: any = new Error("Validation failed");
        error.code = "VALIDATION";
        error.all = [
          { path: "/email", message: "Invalid email format", value: "invalid" },
        ];
        throw error;
      })
      .get("/db-unique-violation", () => {
        // 模拟 Drizzle UNIQUE 约束违反
        const error: Partial<DrizzleError> = new Error("Database error");
        error.cause = {
          code: "23505",
          message: "duplicate key value violates unique constraint",
          constraint: "users_email_unique",
        };
        error.query = "INSERT INTO users (email) VALUES ($1)";
        error.params = ["test@example.com"];
        throw error;
      })
      .get("/db-foreign-key-violation", () => {
        // 模拟 Drizzle FOREIGN KEY 约束违反
        const error: Partial<DrizzleError> = new Error("Database error");
        error.cause = {
          code: "23503",
          message: "insert or update on table violates foreign key constraint",
          constraint: "posts_user_id_fkey",
        };
        error.query = "INSERT INTO posts (user_id) VALUES ($1)";
        error.params = [999];
        throw error;
      })
      .get("/db-not-null-violation", () => {
        // 模拟 Drizzle NOT NULL 约束违反
        const error: Partial<DrizzleError> = new Error("Database error");
        error.cause = {
          code: "23502",
          message: 'null value in column "name" violates not-null constraint',
          column: "name",
        };
        error.query = "INSERT INTO users (name) VALUES ($1)";
        error.params = [null];
        throw error;
      })
      .listen(0);

    const server = app.server;
    if (server) {
      baseUrl = `http://${server.hostname}:${server.port}`;
    }
  });

  afterAll(() => {
    app.stop();
  });

  describe("基本功能测试", () => {
    it("应该正常处理成功请求", async () => {
      const response = await fetch(`${baseUrl}/ok`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ message: "ok" });
    });
  });

  describe("HTTP 错误测试", () => {
    it("应该返回 404 Not Found", async () => {
      const response = await fetch(`${baseUrl}/not-found`);
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toBe(
        "application/problem+json; charset=utf-8"
      );

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/404",
        title: "Not Found",
        status: 404,
        detail: "Resource not found",
        instance: "/not-found",
      });
    });

    it("应该返回 400 Bad Request", async () => {
      const response = await fetch(`${baseUrl}/bad-request`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/400",
        title: "Bad Request",
        status: 400,
        detail: "Invalid input",
        instance: "/bad-request",
      });
    });

    it("应该返回 401 Unauthorized", async () => {
      const response = await fetch(`${baseUrl}/unauthorized`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/401",
        title: "Unauthorized",
        status: 401,
        detail: "Please login",
        instance: "/unauthorized",
      });
    });

    it("应该返回 403 Forbidden", async () => {
      const response = await fetch(`${baseUrl}/forbidden`);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/403",
        title: "Forbidden",
        status: 403,
        detail: "Access denied",
        instance: "/forbidden",
      });
    });

    it("应该返回 409 Conflict", async () => {
      const response = await fetch(`${baseUrl}/conflict`);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/409",
        title: "Conflict",
        status: 409,
        detail: "Resource already exists",
        instance: "/conflict",
      });
    });

    it("应该返回 500 Internal Server Error", async () => {
      const response = await fetch(`${baseUrl}/internal-error`);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/500",
        title: "Internal Server Error",
        status: 500,
        detail: "Something went wrong",
        instance: "/internal-error",
      });
    });
  });

  describe("自定义错误测试", () => {
    it("应该将普通 Error 转换为 500 错误", async () => {
      const response = await fetch(`${baseUrl}/custom-error`);
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/500",
        title: "Internal Server Error",
        status: 500,
        detail: "Custom error",
        instance: "/custom-error",
      });
    });
  });

  describe("验证错误测试", () => {
    it("应该处理 Elysia 验证错误", async () => {
      const response = await fetch(`${baseUrl}/validation-error`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/400",
        title: "Bad Request",
        status: 400,
        detail: "Validation Failed",
        instance: "/validation-error",
      });
      expect(data.errors).toEqual([
        { path: "/email", message: "Invalid email format", value: "invalid" },
      ]);
    });
  });

  describe("数据库错误测试", () => {
    it("应该将 UNIQUE 约束违反转换为 409 Conflict", async () => {
      const response = await fetch(`${baseUrl}/db-unique-violation`);
      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.title).toBe("Conflict");
      expect(data.status).toBe(409);
      expect(data.detail).toContain("重复数据");
      expect(data.instance).toBe("/db-unique-violation");
      expect(data["x-pg-code"]).toBe("23505");
      expect(data["x-constraint"]).toBe("users_email_unique");
    });

    it("应该将 FOREIGN KEY 约束违反转换为 400 Bad Request", async () => {
      const response = await fetch(`${baseUrl}/db-foreign-key-violation`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/400",
        title: "Bad Request",
        status: 400,
        detail: expect.stringContaining("引用错误"),
        instance: "/db-foreign-key-violation",
      });
      expect(data["x-pg-code"]).toBe("23503");
      expect(data["x-constraint"]).toBe("posts_user_id_fkey");
    });

    it("应该将 NOT NULL 约束违反转换为 400 Bad Request", async () => {
      const response = await fetch(`${baseUrl}/db-not-null-violation`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/400",
        title: "Bad Request",
        status: 400,
        detail: expect.stringContaining("name"),
        instance: "/db-not-null-violation",
      });
      expect(data["x-pg-code"]).toBe("23502");
    });
  });

  describe("扩展字段测试", () => {
    it("应该支持自定义扩展字段", async () => {
      const testApp = new Elysia()
        .use(standardErrorSuite({ logging: false }))
        .get("/custom", () => {
          throw new HttpError.BadRequest("Validation failed", {
            errors: [
              { field: "email", message: "Invalid email" },
              { field: "age", message: "Must be positive" },
            ],
            requestId: "req-123",
          });
        })
        .listen(0);

      const server = testApp.server;
      if (server) {
        const response = await fetch(
          `http://${server.hostname}:${server.port}/custom`
        );
        const data = await response.json();

        expect(data.title).toBe("Bad Request");
        expect(data.status).toBe(400);
        expect(data.detail).toBe("Validation failed");
        expect(data.errors).toEqual([
          { field: "email", message: "Invalid email" },
          { field: "age", message: "Must be positive" },
        ]);
        expect(data.requestId).toBe("req-123");
      }

      testApp.stop();
    });
  });

  describe("typeBaseUrl 配置测试", () => {
    it("应该使用默认的 httpstatuses.com URL", async () => {
      const testApp = new Elysia()
        .use(standardErrorSuite({ logging: false }))
        .get("/test", () => {
          throw new HttpError.NotFound("Not found");
        })
        .listen(0);

      const server = testApp.server;
      if (server) {
        const response = await fetch(
          `http://${server.hostname}:${server.port}/test`
        );
        const data = await response.json();

        expect(data.type).toBe("https://httpstatuses.com/404");
      }

      testApp.stop();
    });

    it("应该使用自定义的 typeBaseUrl", async () => {
      const testApp = new Elysia()
        .use(
          standardErrorSuite({
            typeBaseUrl: "https://myapi.com/docs/errors",
            logging: false,
          })
        )
        .get("/test", () => {
          throw new HttpError.NotFound("Not found");
        })
        .listen(0);

      const server = testApp.server;
      if (server) {
        const response = await fetch(
          `http://${server.hostname}:${server.port}/test`
        );
        const data = await response.json();

        expect(data.type).toBe("https://myapi.com/docs/errors/404");
      }

      testApp.stop();
    });
  });

  describe("404 路由未找到测试", () => {
    it("应该返回 404 当路由不存在", async () => {
      const response = await fetch(`${baseUrl}/this-route-does-not-exist`);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toMatchObject({
        type: "https://api.example.com/errors/404",
        title: "Not Found",
        status: 404,
        instance: "/this-route-does-not-exist",
      });
    });
  });
});
