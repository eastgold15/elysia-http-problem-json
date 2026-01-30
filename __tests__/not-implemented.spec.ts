import { expect, describe, it } from "bun:test";
import { HttpError } from "../src/errors";
import { Elysia } from "elysia";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.NotImplemented", () => {
  it("should handle explicit HttpError.NotImplemented", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/resource", () => {
        throw new HttpError.NotImplemented("Not implemented");
      });

    const res = await app.handle(new Request("http://localhost/resource"));
    const json = await res.json();

    expect(res.status).toBe(501);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json",
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/501",
      title: "Not Implemented",
      status: 501,
      instance: "/resource",
      detail: "Not implemented",
    });
  });
});
