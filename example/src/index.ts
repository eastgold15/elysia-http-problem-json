import {
  DrizzleError,
  HttpError,
  isDatabaseError,
  logErrorWithConsola,
  mapDatabaseError,
  unifiedErrorPlugin,
} from "@pori15/elysia-unified-error";
import { Elysia } from "elysia";

const app = new Elysia()
  .use(
    unifiedErrorPlugin({
      transform: (error) =>
        isDatabaseError(error) ? mapDatabaseError(error) : null,

      onBeforeRespond: (problem, ctx) => {
        if (process.env.NODE_ENV === "development") {
          logErrorWithConsola(problem, ctx);
        }
      },
    })
  )
  .get("/ok", () => ({ message: "ok" }))
  .get("/not-found", () => {
    throw new HttpError.NotFound("Resource not found");
  })
  .get("/bad-request", () => {
    throw new HttpError.BadRequest("Invalid input");
  })
  .get("/unauthorized", () => {
    throw new HttpError.Unauthorized("Please login");
  })
  .get("/forbidden", () => {
    throw new HttpError.Forbidden("Access denied");
  })
  .get("/conflict", () => {
    throw new HttpError.Conflict("Resource already exists");
  })
  .get("/internal-error", () => {
    throw new HttpError.InternalServerError("Something went wrong");
  })
  .get("/custom-error", () => {
    throw new Error("Custom error");
  })
  .get("/validation-error", () => {
    // 模拟 Elysia 验证错误
    const error: any = new Error("Validation failed");
    error.code = "VALIDATION";
    error.all = [
      { path: "/email", message: "Invalid email format", value: "invalid" },
    ];
    throw error;
  })
  .get("/db-unique-violation", () => {
    // 模拟 Drizzle UNIQUE 约束违反
    const error: Partial<DrizzleError> = new Error("Database error");
    error.cause = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      constraint: "users_email_unique",
    };
    error.query = "INSERT INTO users (email) VALUES ($1)";
    error.params = ["test@example.com"];
    throw error;
  })
  .get("/db-foreign-key-violation", () => {
    // 模拟 Drizzle FOREIGN KEY 约束违反
    const error: Partial<DrizzleError> = new Error("Database error");
    error.cause = {
      code: "23503",
      message: "insert or update on table violates foreign key constraint",
      constraint: "posts_user_id_fkey",
    };
    error.query = "INSERT INTO posts (user_id) VALUES ($1)";
    error.params = [999];
    throw error;
  })
  .get("/db-not-null-violation", () => {
    // 模拟 Drizzle NOT NULL 约束违反
    const error: Partial<DrizzleError> = new Error("Database error");
    error.cause = {
      code: "23502",
      message: 'null value in column "name" violates not-null constraint',
      column: "name",
    };
    error.query = "INSERT INTO users (name) VALUES ($1)";
    error.params = [null];
    throw error;
  })
  .listen(3510);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
