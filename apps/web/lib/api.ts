export interface InspirationListItem {
  id: string;
  title: string | null;
  status: "active" | "archived";
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface InspirationDetail extends InspirationListItem {
  notes: string | null;
  source_url: string | null;
  storage_key: string;
  file_url: string;
  archived_at: string | null;
}

export interface InspirationMetadataPatch {
  title?: string | null;
  notes?: string | null;
  source_url?: string | null;
}

interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
  };
}

class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
}

export function getApiOrigin() {
  return new URL(getApiBaseUrl()).origin;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorEnvelope | null = null;

    try {
      payload = (await response.json()) as ApiErrorEnvelope;
    } catch {
      payload = null;
    }

    throw new ApiError(
      response.status,
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.message ?? `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getInspirations(status: "active" | "archived" = "active") {
  return apiFetch<{ data: InspirationListItem[]; meta: { limit: number; offset: number; total: number } }>(
    `/inspirations?status=${status}`,
  );
}

export async function getInspiration(id: string) {
  return apiFetch<{ data: InspirationDetail }>(`/inspirations/${id}`);
}

export async function createInspiration(formData: FormData) {
  return apiFetch<{ data: InspirationDetail }>("/inspirations", {
    body: formData,
    method: "POST",
  });
}

export async function updateInspiration(id: string, payload: InspirationMetadataPatch) {
  return apiFetch<{ data: InspirationDetail }>(`/inspirations/${id}`, {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "PATCH",
  });
}

export async function archiveInspiration(id: string) {
  return apiFetch<{ data: InspirationDetail }>(`/inspirations/${id}/archive`, {
    method: "POST",
  });
}

export async function deleteInspiration(id: string) {
  await apiFetch<void>(`/inspirations/${id}`, {
    method: "DELETE",
  });
}

export function isNotFoundError(error: unknown) {
  return error instanceof ApiError && error.code === "INSPIRATION_NOT_FOUND";
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return `${error.code}: ${error.message}`;
  }

  return "Request failed";
}
