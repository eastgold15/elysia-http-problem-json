import { Elysia, ElysiaCustomStatusResponse } from "elysia";
import { HttpError, ProblemError } from "./errors";

export * from "./errors";

export function httpProblemJsonPlugin() {
  return new Elysia({ name: "elysia-http-problem-json" })
    .error({ PROBLEM_ERROR: ProblemError })
    .onError({ as: "global" }, ({ code, error, path, set }) => {
      if (error instanceof ElysiaCustomStatusResponse) {
        return;
      }

      switch (code) {
        case "PROBLEM_ERROR":
          return error.toJSON();
        case "VALIDATION": {
          // TODO - figure out why error.all throws an error - feels like an elysia bug
          const errorObj = JSON.parse(error.message);

          const problem = new HttpError.BadRequest("The request is invalid", {
            errors: errorObj.errors,
          });
          set.status = problem.status;
          return problem.toJSON();
        }
        case "NOT_FOUND": {
          const problem = new HttpError.NotFound(
            `The requested resource ${path} was not found`,
          );
          set.status = problem.status;
          return problem.toJSON();
        }
        case "PARSE": {
          const problem = new HttpError.BadRequest(
            `The request could not be parsed: ${error.message}`,
          );
          return problem.toJSON();
        }
        case "INVALID_COOKIE_SIGNATURE": {
          const problem = new HttpError.BadRequest(
            "The provided cookie signature is invalid",
            { key: error.key },
          );
          set.status = problem.status;
          return problem.toJSON();
        }
        case "INVALID_FILE_TYPE": {
          const problem = new HttpError.BadRequest(error.message, {
            property: error.property,
            expected: error.expected,
          });
          set.status = problem.status;
          return problem.toJSON();
        }
        default: {
          const message =
            error instanceof Error ? error.message : String(error);
          const problem = new HttpError.InternalServerError(message);
          set.status = problem.status;
          return problem.toJSON();
        }
      }
    });
}
