import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.ServiceUnavailable", () => {
  it("should handle explicit HttpError.ServiceUnavailable", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/resource", () => {
        throw new HttpError.ServiceUnavailable("Service unavailable");
      });

    const res = await app.handle(new Request("http://localhost/resource"));
    const json = await res.json();

    expect(res.status).toBe(503);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/503",
      title: "Service Unavailable",
      status: 503,
      instance: "/resource",
      detail: "Service unavailable",
    });
  });
});
