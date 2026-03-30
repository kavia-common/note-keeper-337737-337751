/**
 * Notes API client.
 *
 * The backend is expected to run on port 3001 in dev.
 * In production, set REACT_APP_NOTES_API_BASE_URL to the deployed backend origin.
 */

const DEFAULT_BASE_URL = "http://localhost:3001";

/**
 * Prefer env-configured URL when provided.
 * CRA exposes env vars prefixed with REACT_APP_.
 */
function getBaseUrl() {
  return (process.env.REACT_APP_NOTES_API_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
}

// PUBLIC_INTERFACE
export async function listNotes() {
  /** List all notes (newest-first or backend default ordering). */
  return await requestJson(`${getBaseUrl()}/notes`, { method: "GET" });
}

// PUBLIC_INTERFACE
export async function createNote(payload) {
  /** Create a new note. payload: {title: string, content: string} */
  return await requestJson(`${getBaseUrl()}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// PUBLIC_INTERFACE
export async function updateNote(id, payload) {
  /** Update note by id. payload: {title?: string, content?: string} */
  return await requestJson(`${getBaseUrl()}/notes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// PUBLIC_INTERFACE
export async function deleteNote(id) {
  /** Delete note by id. */
  return await requestJson(`${getBaseUrl()}/notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// PUBLIC_INTERFACE
export async function searchNotes(q) {
  /** Search notes by query string. */
  const url = new URL(`${getBaseUrl()}/notes/search`);
  url.searchParams.set("q", q);
  return await requestJson(url.toString(), { method: "GET" });
}

/**
 * Internal helper for JSON requests with good error messages.
 */
async function requestJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const message = await safeReadError(res);
    throw new Error(message || `Request failed (${res.status})`);
  }

  // 204 No Content
  if (res.status === 204) return null;

  return await res.json();
}

async function safeReadError(res) {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await res.json();
      // Common FastAPI formats: {"detail": "..."} or {"detail":[...]}
      if (typeof json?.detail === "string") return json.detail;
      return JSON.stringify(json);
    }
    const text = await res.text();
    return text;
  } catch {
    return "";
  }
}
