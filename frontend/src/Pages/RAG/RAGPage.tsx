import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { FaRegFileLines } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

import PageHeaderCard from "../../Components/Layout/PageHeaderCard";
import SidebarLayout from "../../Components/Layout/SidebarLayout";
import ChatMessage, { type ChatMessageItem } from "../../Components/RAG/ChatMessage";
import ObsidianFileDialog, {
  type ObsidianFileDialogHandle,
} from "../../Components/ModulePannel/Components/ObsidianFileDialog";
import api, { type RAGCitation } from "../../Utils/api";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeNoteName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`;
}

function detectMentionContext(text: string, cursorIndex: number): { start: number; end: number; term: string } | null {
  const before = text.slice(0, cursorIndex);
  const match = before.match(/(?:^|[\s,])@([^\s,@]*)$/);
  if (!match) {
    return null;
  }
  const atIndex = before.lastIndexOf("@");
  if (atIndex < 0) {
    return null;
  }
  return {
    start: atIndex,
    end: cursorIndex,
    term: match[1] ?? "",
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

type IndexCardProps = {
  status: string;
  errors: string[];
  healthy: boolean | null;
  healthError: string;
  indexing: boolean;
  onStartIndex: () => void;
  onClearIndex: () => void;
};

function IndexCard({
  status,
  errors,
  healthy,
  healthError,
  indexing,
  onStartIndex,
  onClearIndex,
}: IndexCardProps) {
  const statusColour = indexing ? "#e0e0e0" : "#6b6b6b";

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor:
              healthy === null ? "#6b6b6b" : healthy ? "#ededed" : "rgba(255,80,80,0.8)",
          }}
        />
        <Typography variant="caption" sx={{ color: "#6b6b6b" }}>
          {healthy === null
            ? "Checking Ollama..."
            : healthy
            ? "Ollama ready"
            : `Ollama unavailable — ${healthError}`}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Button
          size="small"
          variant="contained"
          onClick={onStartIndex}
          disabled={indexing}
          sx={{ minWidth: 160 }}
        >
          {indexing ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={12} color="inherit" />
              <span>Indexing...</span>
            </Stack>
          ) : (
            "Update Vector Index"
          )}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onClearIndex}
          disabled={indexing}
        >
          Clear
        </Button>
      </Stack>

      <Typography variant="caption" sx={{ color: statusColour }}>
        {status}
      </Typography>
      {errors.length > 0 && (
        <Typography variant="caption" sx={{ color: "rgba(255,80,80,0.9)" }}>
          {errors[0]}
        </Typography>
      )}
    </Stack>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function RAGPage() {
  const navigate = useNavigate();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [query, setQuery] = useState("");
  const [scopeModule, setScopeModule] = useState("");
  const [scopeCategory, setScopeCategory] = useState("");

  const [mentionContext, setMentionContext] = useState<{ start: number; end: number; term: string } | null>(null);
  const [mentionOptions, setMentionOptions] = useState<string[]>([]);
  const [loadingMentionOptions, setLoadingMentionOptions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [indexStatus, setIndexStatus] = useState("Not indexed yet.");
  const [indexErrors, setIndexErrors] = useState<string[]>([]);
  const [indexing, setIndexing] = useState(false);

  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [healthError, setHealthError] = useState("");

  const [allModules, setAllModules] = useState<PrimaryTag[]>([]);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [activeFile, setActiveFile] = useState<{ name: string; content: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [highlightedRange, setHighlightedRange] = useState<{ lineStart: number; lineEnd: number } | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionAnchorRef = useRef<HTMLDivElement | null>(null);
  const noteDialogRef = useRef<ObsidianFileDialogHandle>(null);
  const hasMountedMessagesRef = useRef(false);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("selectedTag");
    if (!saved) return;
    try {
      const parsed: PrimaryTag = JSON.parse(saved);
      setScopeModule(parsed.name);
    } catch {
      localStorage.removeItem("selectedTag");
    }
  }, []);

  useEffect(() => {
    api.get<PrimaryTag[]>("primary-tags/").then((res) => {
      if (res?.data) setAllModules(res.data);
    });
  }, []);

  // ── Polling ────────────────────────────────────────────────────────────────

  const fetchStatus = () => {
    api.rag.getIndexStatus().then((res) => {
      if (!res?.data) return;
      const d = res.data;
      const indexedFiles = d.processed_files + d.skipped_files;
      const filesPart =
        d.status === "running"
          ? `${d.processed_files}/${d.total_files} files processed`
          : `${indexedFiles}/${d.total_files} files indexed`;
      const base = `${d.status} · ${filesPart} · ${d.total_chunks} chunks`;
      const currentFile = d.current_file ? ` · ${d.current_file}` : "";
      const errorSummary = d.errors.length > 0 ? ` · ${d.errors.length} error(s)` : "";
      setIndexStatus(base + currentFile + errorSummary);
      setIndexErrors(d.errors);
      setIndexing(d.status === "running");
    });
  };

  const fetchHealth = () => {
    api.rag.getHealth().then((res) => {
      if (!res?.data) {
        setHealthy(false);
        setHealthError("backend unreachable");
        return;
      }
      setHealthy(res.data.healthy);
      setHealthError(res.data.error ?? "");
    });
  };

  useEffect(() => {
    fetchStatus();
    fetchHealth();
    const interval = window.setInterval(fetchStatus, 4000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const moduleOptions = useMemo(() => allModules.map((m) => m.name), [allModules]);
  const categoryOptions = useMemo(() => {
    const current = allModules.find((m) => m.name === scopeModule);
    return current ? current.subtags.map((s) => s.name) : ([] as string[]);
  }, [allModules, scopeModule]);

  const mentionOpen = mentionContext != null && mentionOptions.length > 0;

  useEffect(() => {
    if (!mentionContext) {
      setMentionOptions([]);
      setMentionIndex(0);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingMentionOptions(true);
      api.rag
        .getFiles(
          mentionContext.term,
          12,
          scopeModule || undefined,
          scopeCategory || undefined,
        )
        .then((res) => {
          setMentionOptions(res?.data?.files ?? []);
          setMentionIndex(0);
        })
        .finally(() => {
          setLoadingMentionOptions(false);
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [mentionContext, scopeModule, scopeCategory]);

  // ── Scroll to latest message ───────────────────────────────────────────────

  useEffect(() => {
    if (!hasMountedMessagesRef.current) {
      hasMountedMessagesRef.current = true;
      return;
    }

    if (messages.length === 0) {
      return;
    }

    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectTag = (tag: PrimaryTag) => {
    localStorage.setItem("selectedTag", JSON.stringify(tag));
    navigate(`/modules/${tag.id}`);
  };

  const handleStartIndexing = async () => {
    setIndexing(true);
    await api.rag.startIndex(false);
    fetchStatus();
  };

  const handleClearIndex = async () => {
    await api.rag.clearIndex();
    fetchStatus();
  };

  const handleAsk = async () => {
    const trimmed = query.trim();
    if (!trimmed || loadingAnswer) return;

    const userMsg: ChatMessageItem = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoadingAnswer(true);
    setQuery("");

    const response = await api.rag.query({
      query: trimmed,
      scope_module: scopeModule || undefined,
      scope_category: scopeCategory || undefined,
      top_k: 6,
    });

    if (!response?.data) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: "Could not reach the RAG endpoint. Check backend logs and try again.",
        },
      ]);
      setLoadingAnswer(false);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: response.data.answer,
        citations: response.data.citations,
      },
    ]);
    setLoadingAnswer(false);
  };

  const openCitationNote = (citation: RAGCitation) => {
    setFileError(null);
    setHighlightedRange({ lineStart: citation.line_start, lineEnd: citation.line_end });
    api
      .post<{ name: string; content: string }>("obsidian-file/", { path: citation.file_path })
      .then((res) => {
        if (!res?.data) {
          setFileError("Could not open referenced note.");
          return;
        }
        setActiveFile(res.data);
        setNoteDialogOpen(true);
        noteDialogRef.current?.navigate(res.data);
      })
      .catch(() => {
        setFileError("Could not open referenced note.");
      });
  };

  const openWikiLink = (name: string) => {
    setFileError(null);
    setHighlightedRange(null);
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name })
      .then((res) => {
        if (!res?.data) {
          setFileError("Could not open linked note.");
          return;
        }
        setActiveFile(res.data);
        setNoteDialogOpen(true);
        noteDialogRef.current?.navigate(res.data);
      })
      .catch(() => {
        setFileError("Could not open linked note.");
      });
  };

  const refreshActiveFile = () => {
    if (!activeFile) {
      return;
    }
    setFileError(null);
    api
      .post<{ name: string; content: string }>("obsidian-file-by-name/", { name: activeFile.name })
      .then((res) => {
        if (!res?.data) {
          setFileError("Could not refresh note.");
          return;
        }
        setActiveFile(res.data);
        noteDialogRef.current?.refreshCurrent(res.data);
      })
      .catch(() => {
        setFileError("Could not refresh note.");
      });
  };

  const applyMention = (fileName: string) => {
    if (!mentionContext) {
      return;
    }
    const normalized = normalizeNoteName(fileName);
    const replacement = `@${normalized} `;
    const nextQuery =
      query.slice(0, mentionContext.start) + replacement + query.slice(mentionContext.end);
    const nextCursor = mentionContext.start + replacement.length;

    setQuery(nextQuery);
    setMentionContext(null);
    setMentionOptions([]);
    setMentionIndex(0);

    window.requestAnimationFrame(() => {
      if (!queryInputRef.current) {
        return;
      }
      queryInputRef.current.focus();
      queryInputRef.current.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionOptions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = mentionOptions[mentionIndex] ?? mentionOptions[0];
        if (selected) {
          applyMention(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionContext(null);
        setMentionOptions([]);
        setMentionIndex(0);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleAsk();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout
      selectedTagId={null}
      onSelectTag={handleSelectTag}
      onTagsChanged={() => {}}
      refreshKey={0}
      contentMaxWidth="none"
    >
      <Stack spacing={2} sx={{ width: "100%" }}>
        <PageHeaderCard
          icon={<FaRegFileLines size={18} style={{ color: "#6b6b6b" }} />}
          title="Ask Vault"
          titleVariant="h5"
          description="Ask questions about your notes. Mention specific files inline with @filename.md."
        >
          <Stack spacing={3}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              <TextField
                select
                label="Module"
                size="small"
                value={scopeModule}
                onChange={(e) => {
                  setScopeModule(e.target.value);
                  setScopeCategory("");
                }}
                sx={{ minWidth: "200px" }}
              >
                <MenuItem value="">All modules</MenuItem>
                {moduleOptions.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Category"
                size="small"
                value={scopeCategory}
                onChange={(e) => setScopeCategory(e.target.value)}
                disabled={!scopeModule}
                sx={{ minWidth: "200px" }}
              >
                <MenuItem value="">All categories</MenuItem>
                {categoryOptions.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.07)" }} />

            <IndexCard
              status={indexStatus}
              errors={indexErrors}
              healthy={healthy}
              healthError={healthError}
              indexing={indexing}
              onStartIndex={handleStartIndexing}
              onClearIndex={handleClearIndex}
            />
          </Stack>
        </PageHeaderCard>

        {/* Chat area */}
        <Paper
          elevation={0}
          sx={{
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            backgroundColor: "#141414",
            overflow: "hidden",
          }}
        >
          {/* Thread */}
          <Box
            sx={{
              minHeight: "320px",
              maxHeight: "52vh",
              overflow: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "200px",
                }}
              >
                <Typography variant="body2" sx={{ color: "#6b6b6b", textAlign: "center" }}>
                  No questions yet.
                  <br />
                  Try: "What were the key concepts in my networking notes?"
                </Typography>
              </Box>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCitationClick={openCitationNote}
                  onWikiLinkClick={openWikiLink}
                />
              ))
            )}

            {loadingAnswer && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 0.5 }}>
                <CircularProgress size={14} sx={{ color: "#6b6b6b" }} />
                <Typography variant="caption" sx={{ color: "#6b6b6b" }}>
                  Thinking…
                </Typography>
              </Stack>
            )}

            <div ref={chatEndRef} />
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.07)" }} />

          {/* Input row */}
          <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ p: 1.5 }}>
            <Box ref={mentionAnchorRef} sx={{ flex: 1, position: "relative" }}>
              <TextField
                placeholder="Ask your vault… use @filename.md for inline note mentions"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  const cursor = e.target.selectionStart ?? next.length;
                  setQuery(next);
                  setMentionContext(detectMentionContext(next, cursor));
                }}
                onClick={() => {
                  const input = queryInputRef.current;
                  if (!input) {
                    return;
                  }
                  const cursor = input.selectionStart ?? query.length;
                  setMentionContext(detectMentionContext(query, cursor));
                }}
                onKeyDown={handleQueryKeyDown}
                fullWidth
                multiline
                minRows={1}
                maxRows={5}
                size="small"
                disabled={loadingAnswer}
                inputRef={queryInputRef}
              />

              {mentionOpen && (
                <Paper
                  elevation={0}
                  sx={{
                    position: "absolute",
                    left: 0,
                    bottom: "calc(100% + 8px)",
                    width: "min(460px, 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "6px",
                    backgroundColor: "#1c1c1c",
                    overflow: "hidden",
                    zIndex: 20,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  <List dense disablePadding sx={{ maxHeight: 220, overflowY: "auto" }}>
                    {mentionOptions.map((fileName, index) => (
                      <ListItemButton
                        key={fileName}
                        selected={index === mentionIndex}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applyMention(fileName);
                        }}
                        sx={{ borderRadius: 0 }}
                      >
                        <ListItemText
                          primary={fileName}
                          primaryTypographyProps={{
                            variant: "body2",
                            sx: { fontFamily: "monospace", color: "#ededed" },
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                  {loadingMentionOptions && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 1 }}>
                      <CircularProgress size={12} sx={{ color: "#6b6b6b" }} />
                      <Typography variant="caption" sx={{ color: "#6b6b6b" }}>
                        Searching notes…
                      </Typography>
                    </Stack>
                  )}
                </Paper>
              )}
            </Box>
            <Button
              variant="contained"
              onClick={() => void handleAsk()}
              disabled={loadingAnswer || query.trim().length === 0}
              sx={{ flexShrink: 0, alignSelf: "flex-end" }}
            >
              Ask
            </Button>
          </Stack>
        </Paper>

        {fileError && (
          <Typography variant="caption" sx={{ color: "rgba(255,80,80,0.9)" }}>
            {fileError}
          </Typography>
        )}

      </Stack>

      {activeFile && (
        <ObsidianFileDialog
          ref={noteDialogRef}
          open={noteDialogOpen}
          onClose={() => {
            setNoteDialogOpen(false);
            setHighlightedRange(null);
          }}
          file={activeFile}
          onWikiLink={openWikiLink}
          onRefresh={refreshActiveFile}
          highlightRange={highlightedRange}
        />
      )}
    </SidebarLayout>
  );
}
