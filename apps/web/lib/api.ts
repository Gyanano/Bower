export type AIProvider = "openai" | "anthropic" | "google" | "volcengine";
export type UILanguage = "zh-CN" | "en";

export interface Board {
  id: string;
  name: string;
  slug: string;
}

export interface InspirationListItem {
  id: string;
  board_id: string | null;
  board_name: string | null;
  title: string | null;
  status: "active" | "archived";
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
  updated_at: string;
  file_url: string;
  analysis_status: "idle" | "processing" | "completed" | "failed";
  analysis_error: string | null;
  analysis_tags_en: string[];
  analysis_tags_zh: string[];
}

export interface InspirationDetail extends InspirationListItem {
  notes: string | null;
  source_url: string | null;
  analysis_summary: string | null;
  analysis_tags: string[];
  analysis_prompt_en: string | null;
  analysis_prompt_zh: string | null;
  analysis_colors: string[];
  storage_key: string;
  analyzed_at: string | null;
  archived_at: string | null;
}

export interface InspirationMetadataPatch {
  title?: string | null;
  notes?: string | null;
  source_url?: string | null;
  board_id?: string | null;
}

export interface AISettings {
  provider: AIProvider | null;
  provider_source: "stored" | "legacy_env" | null;
  model_id: string | null;
  has_api_key: boolean;
  api_key_mask: string | null;
  api_key_source: "stored" | "legacy_env" | null;
  updated_at: string | null;
}

export interface AISettingsUpdate {
  provider: AIProvider;
  model_id?: string | null;
  api_key?: string;
  clear_api_key?: boolean;
}

export interface AISettingsTestRequest {
  provider: AIProvider;
  model_id?: string | null;
  api_key?: string | null;
}

export interface AISettingsTestResult {
  success: boolean;
  provider: AIProvider;
  model_id: string | null;
  message: string;
}

export interface AppPreferences {
  ui_language: UILanguage;
  updated_at: string | null;
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

export async function getInspirations(params?: {
  status?: "active" | "archived";
  q?: string;
  board_id?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set("status", params?.status ?? "active");
  searchParams.set("limit", String(params?.limit ?? 40));
  searchParams.set("offset", String(params?.offset ?? 0));
  if (params?.q) {
    searchParams.set("q", params.q);
  }
  if (params?.board_id) {
    searchParams.set("board_id", params.board_id);
  }

  return apiFetch<{ data: InspirationListItem[]; meta: { limit: number; offset: number; total: number } }>(
    `/inspirations?${searchParams.toString()}`,
  );
}

export async function getInspiration(id: string) {
  return apiFetch<{ data: InspirationDetail }>(`/inspirations/${id}`);
}

export async function getBoards() {
  return apiFetch<{ data: Board[] }>("/boards");
}

export async function getAiSettings() {
  return apiFetch<{ data: AISettings }>("/settings/ai");
}

export async function testAiSettings(payload: AISettingsTestRequest) {
  return apiFetch<{ data: AISettingsTestResult }>("/settings/ai/test", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

export async function getAppPreferences() {
  return apiFetch<{ data: AppPreferences }>("/settings/preferences");
}

export async function updateAppPreferences(payload: { ui_language: UILanguage }) {
  return apiFetch<{ data: AppPreferences }>("/settings/preferences", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "PUT",
  });
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

export async function analyzeInspiration(id: string) {
  return apiFetch<{ data: InspirationDetail }>(`/inspirations/${id}/analyze`, {
    method: "POST",
  });
}

export async function updateAiSettings(payload: AISettingsUpdate) {
  return apiFetch<{ data: AISettings }>("/settings/ai", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "PUT",
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
