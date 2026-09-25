import { config } from "@/lib/config";
import { ApiError, toProblem } from "./errors";
import type { RegisterRequest, RegisterResponse, SlugAvailability } from "./types";

/** Root-domain endpoints: no tenant, no session. */
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(config.apiUrl + path, {
      ...init,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
  } catch {
    throw ApiError.network();
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new ApiError(toProblem(response.status, body));
  }
  return body as T;
}

export const publicApi = {
  slugAvailability: (slug: string) =>
    call<SlugAvailability>(`/public/tenants/slug-availability?slug=${encodeURIComponent(slug)}`),
  register: (request: RegisterRequest) =>
    call<RegisterResponse>("/public/tenants/register", { method: "POST", body: JSON.stringify(request) }),
};
