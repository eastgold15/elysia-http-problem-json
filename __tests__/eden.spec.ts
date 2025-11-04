import { describe, expect, expectTypeOf, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import Elysia from "elysia";

describe("@elysiajs/eden", () => {
  it("should generate types correctly", () => {
    const app = new Elysia().get("/foo", () => ({ bar: "baz" }));

    type App = typeof app;

    const client = treaty<App>("");

    type FooResponse = Awaited<ReturnType<typeof client.foo.get>>;

    expectTypeOf<FooResponse["data"]>().toEqualTypeOf<{ bar: string } | null>();
    expectTypeOf<FooResponse["error"]>();
  });

  it("should work", async () => {
    const app = new Elysia().get("/foo", () => ({ bar: "baz" })).listen(0);

    const client = treaty<typeof app>(`http://localhost:${app.server?.port}`);

    const res = await client.foo.get();
    if (res.error) throw new Error("Unexpected error");
    expect(res.data).toEqual({ bar: "baz" });
    expectTypeOf(res.data).toEqualTypeOf<{ bar: string }>();
  });
});
