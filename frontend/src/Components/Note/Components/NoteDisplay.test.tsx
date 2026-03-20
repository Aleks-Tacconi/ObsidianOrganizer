import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, expect, it } from "vitest";

import type { Note } from "../../../Utils/types/api.schemas";
import NoteDisplay from "./NoteDisplay";

const theme = createTheme();

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  completed: false,
  description: "Short description",
  date: "2026-03-08",
  id: 1,
  name: "Test note title",
  primary_tag: {
    color: "#e0e0e0",
    id: 10,
    name: "Physics",
    subtags: [],
  },
  primary_tag_id: 10,
  subtags: [],
  subtags_ids: [],
  urls: [],
  urls_ids: [],
  ...overrides,
});

describe("NoteDisplay", () => {
  it("renders a vertically centered and larger title row", () => {
    render(
      <ThemeProvider theme={theme}>
        <NoteDisplay note={makeNote()} />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("note-title-row")).toHaveStyle({ alignItems: "center" });
    expect(screen.getByTestId("note-title-icon")).toHaveStyle({ width: "32px", height: "32px" });
    expect(screen.getByText("Test note title")).toHaveStyle({ fontSize: "1.5rem", lineHeight: "1.2" });
  });

  it("does not render the description section when there is no description", () => {
    render(
      <ThemeProvider theme={theme}>
        <NoteDisplay note={makeNote({ description: undefined })} />
      </ThemeProvider>,
    );

    expect(screen.queryByText("Show more")).not.toBeInTheDocument();
    expect(screen.queryByText("Short description")).not.toBeInTheDocument();
  });

  it("expands long descriptions on demand", () => {
    const longDescription = Array.from({ length: 4 }, (_, index) => `Line ${index + 1}`).join("\n\n");

    render(
      <ThemeProvider theme={theme}>
        <NoteDisplay note={makeNote({ description: longDescription })} />
      </ThemeProvider>,
    );

    const toggle = screen.getByRole("button", { name: "Show more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Line 4")).toBeInTheDocument();
  });

  it("renders related resources when note urls are present", () => {
    render(
      <ThemeProvider theme={theme}>
        <NoteDisplay
          note={makeNote({
            urls: [
              {
                alias: "Lecture recording",
                id: 44,
                url: "https://example.com/lecture",
              },
            ],
          })}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("Related Resources")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lecture recording" })).toHaveAttribute("href", "https://example.com/lecture");
    expect(screen.getByText("https://example.com/lecture")).toBeInTheDocument();
  });

  it("renders markdown lists in the note description", () => {
    render(
      <ThemeProvider theme={theme}>
        <NoteDisplay
          note={makeNote({
            description: "- First bullet\n- Second bullet\n\n1. First step\n2. Second step",
          })}
        />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByText("First bullet")).toBeInTheDocument();
    expect(screen.getByText("Second step")).toBeInTheDocument();
  });
});
