import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.NotAcceptable", () => {
  it("should handle explicit HttpError.NotAcceptable", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/resource", () => {
        throw new HttpError.NotAcceptable("Not acceptable");
      });

    const res = await app.handle(new Request("http://localhost/resource"));
    const json = await res.json();

    expect(res.status).toBe(406);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/406",
      title: "Not Acceptable",
      status: 406,
      instance: "/resource",
      detail: "Not acceptable",
    });
  });
});
