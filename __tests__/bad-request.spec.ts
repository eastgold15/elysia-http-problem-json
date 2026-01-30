import { describe, expect, it } from "bun:test";
import { Elysia, fileType, InvalidCookieSignature } from "elysia";
import z from "zod";
import { HttpError } from "../src/errors";
import { httpProblemJsonPlugin } from "../src/index";

describe("HttpError.BadRequest", () => {
  it("should handle explicit HttpError.BadRequest", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/foo", () => {
        throw new HttpError.BadRequest("This is a bad request", {
          field: "name",
          message: "Name is required",
          instance: "/foo",
        });
      });

    const res = await app.handle(new Request("http://localhost/foo"));
    const json = await res.json();

    expect(res.status).toBe(400);
    // RFC 9457 Section 6: Content-Type must be application/problem+json
    expect(res.headers.get("Content-Type")).toContain(
      "application/problem+json; charset=utf-8"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/400",
      title: "Bad Request",
      status: 400,
      detail: "This is a bad request",
      field: "name",
      instance: "/foo",
    });
  });

  it("should map elysia.ValidationError to HttpError.BadRequest", async () => {
    const app = await new Elysia().use(httpProblemJsonPlugin()).get(
      "/foo/:id",
      ({ params }) => {
        return params.id;
      },
      {
        params: z.object({
          id: z.coerce.number(),
        }),
      }
    );

    const res = await app.handle(new Request("http://localhost/foo/forty"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe(
      "application/problem+json; charset=utf-8"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/400",
      title: "Bad Request",
      status: 400,
      detail: "Validation Failed",
      instance: "/foo/forty",
      errors: [
        {
          message: "Invalid input: expected number, received NaN",
          path: "id",
          value: {
            id: "forty",
          },
        },
      ],
    });
  });

  it("should map elysia.ParseError  to HttpError.BadRequest", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .post("/foo", ({ body }) => {
        return body;
      });

    const res = await app.handle(
      new Request("http://localhost/foo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ invalidJson: true ",
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe(
      "application/problem+json; charset=utf-8"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/400",
      title: "Bad Request",
      status: 400,
      instance: "/foo",
      detail: "The request could not be parsed: Bad Request",
    });
  });

  it("should map elysia.InvalidCookieSignature to HttpError.Unauthorized", async () => {
    const app = await new Elysia()
      .use(httpProblemJsonPlugin())
      .get("/protected", () => {
        throw new InvalidCookieSignature("foo");
      });

    const res = await app.handle(new Request("http://localhost/protected"));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe(
      "application/problem+json; charset=utf-8"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/400",
      title: "Bad Request",
      status: 400,
      instance: "/protected",
      detail: "The provided cookie signature is invalid",
      key: "foo",
    });
  });

  it("should map elysia.InvalidFileType to HttpError.BadRequest", async () => {
    const app = await new Elysia().use(httpProblemJsonPlugin()).post(
      "/upload",
      async ({ body }) => {
        await fileType(body.file, "application/json");
        return { success: true };
      },
      {
        body: z.object({
          file: z.file(),
        }),
      }
    );

    const jpegFile = new File(["dummy content"], "photo.jpg", {
      type: "image/jpeg",
    });

    const formData = new FormData();
    formData.append("file", jpegFile);
    const res = await app.handle(
      new Request("http://localhost/upload", {
        method: "POST",
        body: formData,
      })
    );

    const json = await res.json();
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe(
      "application/problem+json; charset=utf-8"
    );
    expect(json).toEqual({
      type: "https://httpstatuses.com/400",
      title: "Bad Request",
      status: 400,
      instance: "/upload",
      detail: '"photo.jpg" has invalid file type',
      property: "photo.jpg",
      expected: "application/json",
    });
  });
});
