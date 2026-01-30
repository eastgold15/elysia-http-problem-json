import { expect, describe, it } from "bun:test";
import { HttpError } from "../src/errors";
import { Elysia } from "elysia";
import { httpProblemJsonPlugin } from "../src/index";

describe("httpProblemJsonPlugin", () => {
  // 测试 1：基础功能与 RFC 规范
  it("should return compliant RFC 9457 JSON for explicit HttpError", async () => {
    const app = new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/test-path", () => {
        throw new HttpError.BadGateway("Upstream server timed out");
      });

    const res = await app.handle(new Request("http://localhost/test-path"));
    const json = await res.json();

    expect(res.status).toBe(502);
    // 验证标准 Header
    expect(res.headers.get("Content-Type")).toBe(
      "application/problem+json; charset=utf-8",
    );

    // 验证 RFC 核心字段
    expect(json).toEqual({
      type: "https://httpstatuses.com/502",
      title: "Bad Gateway",
      status: 502,
      detail: "Upstream server timed out",
      instance: "/test-path", // 验证 instance 注入
    });
  });

  // 测试 2：验证 typeBaseUrl 配置
  it("should respect typeBaseUrl configuration", async () => {
    const app = new Elysia()
      .use(
        httpProblemJsonPlugin({
          typeBaseUrl: "https://api.myapp.com/errors",
        }),
      )
      .get("/error", () => {
        throw new HttpError.NotFound("User not found");
      });

    const res = await app.handle(new Request("http://localhost/error"));
    const json = await res.json();

    // 验证 type 是否被正确重写
    expect(json.type).toBe("https://api.myapp.com/errors/404");
  });

  // 测试 3：验证扩展字段 (Extensions)
  it("should include extension members in response", async () => {
    const app = new Elysia().use(httpProblemJsonPlugin()).get("/ext", () => {
      throw new HttpError.BadRequest("Invalid input", {
        remaining_attempts: 3,
        is_retryable: false,
      });
    });

    const res = await app.handle(new Request("http://localhost/ext"));
    const json = await res.json();

    expect(json.remaining_attempts).toBe(3);
    expect(json.is_retryable).toBe(false);
  });
});
