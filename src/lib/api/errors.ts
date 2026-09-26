import { getCurrentLang } from "@/i18n/core";
import { translate } from "@/i18n/text";
import type { FieldError, ProblemDetail } from "./types";

/** An error answered by the API (Problem Details) or a network failure (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldError[];

  constructor(problem: ProblemDetail) {
    super(problem.detail || problem.title || "Request failed");
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code ?? "UNKNOWN";
    this.fieldErrors = problem.errors ?? [];
  }

  static network(): ApiError {
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      detail: "Cannot reach the server. Check your connection and try again.",
    });
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** Turns any response body into a ProblemDetail, even when the server did not send one. */
export function toProblem(status: number, body: unknown): ProblemDetail {
  if (body && typeof body === "object" && "status" in body) {
    return body as ProblemDetail;
  }
  return { status, code: status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN", detail: `Request failed (${status})` };
}

/**
 * Message for an error thrown by a request. In English the server's detail is shown (it is the most specific);
 * in other languages the translated text for the error code, falling back to the detail.
 */
export function errorMessage(error: unknown): string {
  const lang = getCurrentLang();
  if (error instanceof ApiError) {
    const byCode = translate(lang, `errors.${error.code}`);
    const hasCode = byCode !== `errors.${error.code}`;
    const detail = error.message && error.message !== "Request failed" ? error.message : undefined;
    if (lang !== "en" && hasCode) {
      return byCode;
    }
    return detail ?? (hasCode ? byCode : translate(lang, "errors.generic"));
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return translate(lang, "errors.generic");
}

/** True when the error carries per-field validation messages (shown next to the form fields instead). */
export function hasFieldErrors(error: unknown): boolean {
  return error instanceof ApiError && error.fieldErrors.length > 0;
}
