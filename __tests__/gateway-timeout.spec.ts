import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.GatewayTimeout", () => {
  it("should handle explicit HttpError.GatewayTimeout", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/resource", () => {
        throw new HttpError.GatewayTimeout("Gateway timeout");
      });

    const res = await app.handle(new Request("http://localhost/resource"));
    const json = await res.json();

    expect(res.status).toBe(504);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/504",
      title: "Gateway Timeout",
      status: 504,
      instance: "/resource",
      detail: "Gateway timeout",
    });
  });
});
