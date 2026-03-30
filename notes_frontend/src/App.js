import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  createNote,
  deleteNote,
  listNotes,
  searchNotes,
  updateNote,
} from "./api/notesApi";

// PUBLIC_INTERFACE
function App() {
  /** Main notes application screen (CRUD + search) */
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [status, setStatus] = useState({ kind: "idle", message: "" }); // idle|loading|error|success

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const isEditing = Boolean(selectedNote);

  // PUBLIC_INTERFACE
  const refreshNotes = async () => {
    /** Fetch latest notes list from backend */
    setStatus({ kind: "loading", message: "Loading notes…" });
    try {
      const data = await listNotes();
      setNotes(data);
      setStatus({ kind: "idle", message: "" });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e?.message || "Failed to load notes.",
      });
    }
  };

  useEffect(() => {
    void refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sync editor fields when selection changes
    if (!selectedNote) {
      setTitle("");
      setContent("");
      return;
    }
    setTitle(selectedNote.title ?? "");
    setContent(selectedNote.content ?? "");
  }, [selectedNote]);

  // PUBLIC_INTERFACE
  const onSelectNote = (noteId) => {
    /** Select a note from the list for editing */
    setSelectedId(noteId);
    setStatus({ kind: "idle", message: "" });
  };

  // PUBLIC_INTERFACE
  const onNewNote = () => {
    /** Switch editor into "create new note" mode */
    setSelectedId(null);
    setTitle("");
    setContent("");
    setStatus({ kind: "idle", message: "" });
  };

  // PUBLIC_INTERFACE
  const onSave = async (e) => {
    /** Create or update based on whether a note is selected */
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      setStatus({
        kind: "error",
        message: "Add a title or content before saving.",
      });
      return;
    }

    setStatus({ kind: "loading", message: isEditing ? "Saving…" : "Creating…" });

    try {
      if (isEditing) {
        const updated = await updateNote(selectedNote.id, {
          title: trimmedTitle,
          content: trimmedContent,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n)),
        );
        setStatus({ kind: "success", message: "Note updated." });
      } else {
        const created = await createNote({
          title: trimmedTitle || "Untitled",
          content: trimmedContent,
        });
        setNotes((prev) => [created, ...prev]);
        setSelectedId(created.id);
        setStatus({ kind: "success", message: "Note created." });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: err?.message || "Failed to save note.",
      });
    }
  };

  // PUBLIC_INTERFACE
  const onDelete = async () => {
    /** Delete selected note */
    if (!selectedNote) return;
    // eslint-disable-next-line no-alert
    const ok = window.confirm("Delete this note? This cannot be undone.");
    if (!ok) return;

    setStatus({ kind: "loading", message: "Deleting…" });
    try {
      await deleteNote(selectedNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
      setSelectedId(null);
      setTitle("");
      setContent("");
      setStatus({ kind: "success", message: "Note deleted." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err?.message || "Failed to delete note.",
      });
    }
  };

  // PUBLIC_INTERFACE
  const onSearch = async (e) => {
    /** Search notes by query; if query empty, falls back to list */
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      setIsSearching(false);
      await refreshNotes();
      return;
    }

    setIsSearching(true);
    setStatus({ kind: "loading", message: "Searching…" });

    try {
      const results = await searchNotes(q);
      setNotes(results);
      setSelectedId(null);
      setStatus({ kind: "idle", message: "" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err?.message || "Search failed.",
      });
    }
  };

  // PUBLIC_INTERFACE
  const clearSearch = async () => {
    /** Clear search and restore full list */
    setQuery("");
    setIsSearching(false);
    await refreshNotes();
  };

  return (
    <div className="App">
      <header className="appHeader">
        <div className="appHeader__left">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <h1 className="appTitle">Note Keeper</h1>
            <p className="appSubtitle">Lightweight notes with fast search</p>
          </div>
        </div>

        <form className="searchBar" onSubmit={onSearch}>
          <label className="srOnly" htmlFor="searchInput">
            Search notes
          </label>
          <input
            id="searchInput"
            className="input input--search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            autoComplete="off"
          />
          <button className="btn btn--primary" type="submit">
            Search
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => void clearSearch()}
            disabled={!query && !isSearching}
          >
            Clear
          </button>
        </form>
      </header>

      <main className="layout">
        <section className="panel panel--editor" aria-label="Note editor">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">{isEditing ? "Edit note" : "New note"}</h2>
              <p className="panelHint">
                {isEditing
                  ? "Update title/content and save."
                  : "Write a note and click Create."}
              </p>
            </div>

            <div className="panelActions">
              <button className="btn btn--secondary" type="button" onClick={onNewNote}>
                New
              </button>
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => void onDelete()}
                disabled={!isEditing}
                title={!isEditing ? "Select a note to delete" : "Delete selected note"}
              >
                Delete
              </button>
            </div>
          </div>

          <form className="editorForm" onSubmit={onSave}>
            <div className="field">
              <label className="label" htmlFor="titleInput">
                Title
              </label>
              <input
                id="titleInput"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Meeting notes"
              />
            </div>

            <div className="field field--grow">
              <label className="label" htmlFor="contentInput">
                Content
              </label>
              <textarea
                id="contentInput"
                className="textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here…"
              />
            </div>

            <div className="editorFooter">
              <div
                className={`statusBadge statusBadge--${status.kind}`}
                role={status.kind === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {status.kind === "idle" ? "Ready" : status.message}
              </div>

              <button className="btn btn--primary btn--wide" type="submit">
                {isEditing ? "Save changes" : "Create note"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel panel--list" aria-label="Notes list">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">
                Notes <span className="countPill">{notes.length}</span>
              </h2>
              <p className="panelHint">
                {isSearching
                  ? "Showing search results."
                  : "Select a note to edit it."}
              </p>
            </div>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => void refreshNotes()}
              title="Refresh notes"
            >
              Refresh
            </button>
          </div>

          <div className="notesList" role="list">
            {notes.length === 0 ? (
              <div className="emptyState">
                <h3 className="emptyState__title">No notes yet</h3>
                <p className="emptyState__text">
                  Create your first note using the editor.
                </p>
              </div>
            ) : (
              notes.map((n) => {
                const active = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`noteCard ${active ? "noteCard--active" : ""}`}
                    onClick={() => onSelectNote(n.id)}
                    role="listitem"
                    aria-current={active ? "true" : "false"}
                  >
                    <div className="noteCard__top">
                      <div className="noteCard__title">
                        {n.title?.trim() ? n.title : "Untitled"}
                      </div>
                      <div className="noteCard__meta">
                        {n.updated_at ? formatDateTime(n.updated_at) : ""}
                      </div>
                    </div>
                    <div className="noteCard__preview">
                      {makePreview(n.content)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      <footer className="appFooter">
        <span className="appFooter__text">
          Backend: <code>http://localhost:3001</code>
        </span>
      </footer>
    </div>
  );
}

/**
 * Formats ISO date string into a compact, readable timestamp.
 * Kept tolerant: if parsing fails, returns empty string.
 */
function formatDateTime(isoString) {
  try {
    const dt = new Date(isoString);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Make a single-line preview from note content.
 */
function makePreview(content) {
  if (!content) return "—";
  const cleaned = String(content).replace(/\s+/g, " ").trim();
  return cleaned.length > 120 ? `${cleaned.slice(0, 120)}…` : cleaned;
}

export default App;
