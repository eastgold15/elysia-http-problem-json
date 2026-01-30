import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.PaymentRequired", () => {
  it("should handle explicit HttpError.PaymentRequired", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/resource", () => {
        throw new HttpError.PaymentRequired("Payment required");
      });

    const res = await app.handle(new Request("http://localhost/resource"));
    const json = await res.json();

    expect(res.status).toBe(402);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/402",
      title: "Payment Required",
      status: 402,
      instance: "/resource",
      detail: "Payment required",
    });
  });
});
