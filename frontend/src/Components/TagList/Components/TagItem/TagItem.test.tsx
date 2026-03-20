import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it, vi } from "vitest";

import type { PrimaryTag } from "../../../../Utils/types/api.schemas";
import TagItem from "./TagItem";

type SidebarTag = PrimaryTag & {
  completed_note_count?: number;
  note_count?: number;
  is_complete?: boolean;
};

const theme = createTheme();

const makeTag = (overrides: Partial<SidebarTag> = {}): SidebarTag => ({
  color: "#88ccaa",
  id: 1,
  name: "Algorithms",
  subtags: [],
  completed_note_count: 0,
  note_count: 0,
  is_complete: false,
  ...overrides,
});

function renderTagItem(tag: SidebarTag, selected = false) {
  render(
    <ThemeProvider theme={theme}>
      <TagItem
        tag={tag}
        selected={selected}
        onClick={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    </ThemeProvider>,
  );
}

describe("TagItem", () => {
  it("renders a completion indicator for fully completed modules", () => {
    renderTagItem(makeTag({ completed_note_count: 6, note_count: 6, is_complete: true }));

    expect(screen.getByLabelText("Algorithms complete")).toBeInTheDocument();
  });

  it("does not render a completion indicator for incomplete modules", () => {
    renderTagItem(makeTag({ completed_note_count: 5, note_count: 6, is_complete: false }));

    expect(screen.queryByLabelText("Algorithms complete")).not.toBeInTheDocument();
  });
});
