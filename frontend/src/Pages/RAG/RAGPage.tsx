import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import SidebarLayout from "../../Components/Layout/SidebarLayout";
import ChatMessage, { type ChatMessageItem } from "../../Components/RAG/ChatMessage";
import CitationNoteDialog from "../../Components/RAG/CitationNoteDialog";
import api, { type RAGCitation } from "../../Utils/api";
import type { PrimaryTag } from "../../Utils/types/api.schemas";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseManualNotes(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => (t.endsWith(".md") ? t : `${t}.md`));
}

// ─── Sub-components ─────────────────────────────────────────────────────────

type IndexCardProps = {
  status: string;
  healthy: boolean | null;
  healthError: string;
  indexing: boolean;
  onStartIndex: () => void;
  onClearIndex: () => void;
};

function IndexCard({ status, healthy, healthError, indexing, onStartIndex, onClearIndex }: IndexCardProps) {
  const statusColour = indexing ? "#e0e0e0" : "#6b6b6b";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "6px",
        backgroundColor: "#141414",
      }}
    >
      <Stack spacing={1.5}>
        {/* Health row */}
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
              ? "Checking Ollama…"
              : healthy
              ? "Ollama ready"
              : `Ollama unavailable — ${healthError}`}
          </Typography>
        </Stack>

        {/* Action row */}
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
                <span>Indexing…</span>
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

        {/* Status text */}
        <Typography variant="caption" sx={{ color: statusColour }}>
          {status}
        </Typography>
      </Stack>
    </Paper>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function RAGPage() {
  const navigate = useNavigate();
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [query, setQuery] = useState("");
  const [scopeModule, setScopeModule] = useState("");
  const [scopeCategory, setScopeCategory] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [indexStatus, setIndexStatus] = useState("Not indexed yet.");
  const [indexing, setIndexing] = useState(false);

  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [healthError, setHealthError] = useState("");

  const [allModules, setAllModules] = useState<PrimaryTag[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<RAGCitation | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("selectedTag");
    if (!saved) return;
    try {
      const parsed: PrimaryTag = JSON.parse(saved);
      setSelectedTagId(parsed.id);
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
      const base = `${d.status} · ${d.processed_files}/${d.total_files} files · ${d.total_chunks} chunks`;
      const errors = d.errors.length > 0 ? ` · ${d.errors.length} error(s)` : "";
      setIndexStatus(base + errors);
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

  // ── Scroll to latest message ───────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      force_notes: parseManualNotes(manualNotes),
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

  const handleQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleAsk();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout selectedTagId={selectedTagId} onSelectTag={handleSelectTag} onTagsChanged={() => {}}>
      <Stack spacing={2} sx={{ maxWidth: "900px", mx: "auto" }}>
        {/* Page header */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Ask Vault
          </Typography>
          <Typography variant="body2" sx={{ color: "#6b6b6b", mt: 0.5 }}>
            Ask questions about your notes. Mention specific files inline with @filename.md.
          </Typography>
        </Box>

        {/* Index + health card */}
        <IndexCard
          status={indexStatus}
          healthy={healthy}
          healthError={healthError}
          indexing={indexing}
          onStartIndex={handleStartIndexing}
          onClearIndex={handleClearIndex}
        />

        {/* Scope + force-notes */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "6px",
            backgroundColor: "#141414",
          }}
        >
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

            <TextField
              label="Force notes"
              placeholder="lecture1, summary.md"
              size="small"
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              fullWidth
              helperText="Comma-separated filenames — always included in context"
            />
          </Stack>
        </Paper>

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
                  onCitationClick={(citation) => setSelectedCitation(citation)}
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
            <TextField
              placeholder="Ask your vault… (Shift+Enter for newline)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              fullWidth
              multiline
              minRows={1}
              maxRows={5}
              size="small"
              disabled={loadingAnswer}
            />
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
      </Stack>

      <CitationNoteDialog
        open={selectedCitation != null}
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </SidebarLayout>
  );
}
