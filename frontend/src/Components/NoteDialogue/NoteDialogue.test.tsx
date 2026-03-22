import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it, vi, beforeEach } from "vitest";

import api from "../../Utils/api";
import type { Note } from "../../Utils/types/api.schemas";
import NoteDialog from "./NoteDialogue";

vi.mock("../../Utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const theme = createTheme();

const mockedApi = vi.mocked(api);

const makeNote = (): Note => ({
  completed: false,
  date: "2026-03-08T10:00:00Z",
  description: "Original description",
  id: 1,
  name: "Injection Attacks",
  primary_tag: {
    color: "#e0e0e0",
    id: 7,
    name: "Web Security",
    subtags: [],
  },
  primary_tag_id: 7,
  subtags: [{ id: 3, name: "Injection Attacks", parent: 7 }],
  subtags_ids: [3],
  urls: [],
  urls_ids: [],
});

function renderDialog() {
  render(
    <ThemeProvider theme={theme}>
      <NoteDialog
        open
        onClose={() => {}}
        primaryTagId={7}
        note={makeNote()}
        onSaved={() => {}}
      />
    </ThemeProvider>,
  );
}

describe("NoteDialog description editor", () => {
  beforeEach(() => {
    mockedApi.get.mockResolvedValue({
      data: [{ id: 3, name: "Injection Attacks", parent: 7 }],
    } as never);
  });

  it("saves description changes back into the note form", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Open description editor" }));
    const textarea = await waitFor(() => screen.getByRole("textbox", { name: "Description" }));
    fireEvent.change(textarea, { target: { value: "Updated draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Save description" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open description editor" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open description editor" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Updated draft");
    });
  });

  it("cancels description changes and restores the previous value", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Open description editor" }));
    const textarea = await waitFor(() => screen.getByRole("textbox", { name: "Description" }));
    fireEvent.change(textarea, { target: { value: "Discarded draft" } });
    fireEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Open description editor" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Open description editor" }));

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Original description");
    });
  });

  it("applies markdown helper formatting inside the editor", async () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Open description editor" }));

    const textarea = await waitFor(() => screen.getByRole("textbox", { name: "Description" })) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Line one\nLine two" } });
    textarea.setSelectionRange(0, textarea.value.length);

    fireEvent.click(screen.getByRole("button", { name: "Bullet" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Description")).toHaveValue("- Line one\n- Line two");
    });
  });
});
