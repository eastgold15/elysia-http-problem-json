import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.Unauthorized", () => {
  it("should handle explicit HttpError.Unauthorized", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/protected", () => {
        throw new HttpError.Unauthorized("Protected resource");
      });

    const res = await app.handle(new Request("http://localhost/protected"));
    const json = await res.json();

    expect(res.status).toBe(401);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/401",
      title: "Unauthorized",
      status: 401,
      instance: "/protected",
      detail: "Protected resource",
    });
  });
});
