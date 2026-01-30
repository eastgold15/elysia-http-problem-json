import { expect, describe, it } from "bun:test";
import { HttpError } from "../src/errors";
import { Elysia } from "elysia";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.Forbidden", () => {
  it("should handle explicit HttpError.Forbidden", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/protected", () => {
        throw new HttpError.Forbidden("Access denied");
      });

    const res = await app.handle(new Request("http://localhost/protected"));
    const json = await res.json();

    expect(res.status).toBe(403);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json",
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/403",
      title: "Forbidden",
      status: 403,
      instance: "/protected",
      detail: "Access denied",
    });
  });
});
