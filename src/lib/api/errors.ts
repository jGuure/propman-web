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

/** Friendly fallback text per API error code, used when the server sends no detail. */
export const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Some fields are not valid. Check the form and try again.",
  UNAUTHORIZED: "Please sign in again.",
  FORBIDDEN: "You do not have permission to do this.",
  NOT_FOUND: "This item no longer exists.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
  FILE_TOO_LARGE: "The file is too large (maximum 1 MB).",
  UNSUPPORTED_FILE_TYPE: "Use a PNG, JPEG or WebP image.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  NETWORK_ERROR: "Cannot reach the server. Check your connection and try again.",
  BUILDING_NOT_IN_PROPERTY: "That flat belongs to another property.",
  UNIT_NUMBER_TAKEN: "An apartment with this number already exists in this flat.",
  FLOOR_OUT_OF_RANGE: "The floor is outside the flat's floors.",
  INVALID_STATUS_TRANSITION: "The apartment cannot move to that status from its current status.",
  PROPERTY_HAS_ACTIVE_UNITS: "The property has occupied or reserved apartments. Free them before archiving.",
  BUILDING_HAS_ACTIVE_UNITS: "The flat has occupied or reserved apartments. Free them before archiving.",
  UNIT_NOT_ARCHIVABLE: "Occupied or reserved apartments cannot be archived.",
  BULK_LIMIT_EXCEEDED: "Too many apartments at once (maximum 500).",
  AMENITY_IN_USE: "The amenity is used by properties, flats or apartments. Remove it from them first.",
  AMENITY_SCOPE_MISMATCH: "That amenity cannot be used here.",
  PHOTO_LIMIT_REACHED: "The photo limit has been reached. Delete a photo first.",
};

/** Human message for an error thrown by a request: the server's detail, else the text for its code. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message && error.message !== "Request failed" ? error.message
      : ERROR_MESSAGES[error.code] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

/** True when the error carries per-field validation messages (shown next to the form fields instead). */
export function hasFieldErrors(error: unknown): boolean {
  return error instanceof ApiError && error.fieldErrors.length > 0;
}
