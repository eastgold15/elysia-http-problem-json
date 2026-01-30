import { expect, describe, it } from "bun:test";
import { HttpError } from "../src/errors";
import { Elysia, InternalServerError } from "elysia";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.InternalServerError", () => {
  it("should handle explicit InternalServerError", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/error", () => {
        throw new HttpError.InternalServerError("Database connection failed");
      });

    const res = await app.handle(new Request("http://localhost/error"));
    const json = await res.json();

    expect(res.status).toBe(500);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json",
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/500",
      title: "Internal Server Error",
      status: 500,
      instance: "/error",
      detail: "Database connection failed",
    });
  });

  it("should map generic Error to InternalServerError", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/error", () => {
        throw new Error("Something went wrong");
      });

    const res = await app.handle(new Request("http://localhost/error"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json; charset=utf-8");
    expect(json).toEqual({
      type: "https://httpstatuses.com/500",
      title: "Internal Server Error",
      status: 500,
      instance: "/error",
      detail: "Something went wrong",
    });
  });

  it("should map elysia.InternalServerError to HttpError.InternalServerError", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/error", () => {
        throw new InternalServerError("Elysia internal error");
      });

    const res = await app.handle(new Request("http://localhost/error"));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json; charset=utf-8");
    expect(json).toEqual({
      type: "https://httpstatuses.com/500",
      title: "Internal Server Error",
      status: 500,
      instance: "/error",
      detail: "Elysia internal error",
    });
  });
});
