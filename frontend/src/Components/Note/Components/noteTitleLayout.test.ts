import { describe, expect, it } from "vitest";

import { getNoteTitleLayout } from "./noteTitleLayout";

describe("getNoteTitleLayout", () => {
  it("centers the title vertically with the leading icon", () => {
    expect(getNoteTitleLayout({ completed: false })).toMatchObject({
      titleRowAlignItems: "center",
      iconSize: 18,
      titleLineHeight: 1.2,
    });
  });

  it("keeps the larger title treatment for completed notes too", () => {
    expect(getNoteTitleLayout({ completed: true })).toMatchObject({
      titleVariant: "h5",
      iconSize: 18,
    });
  });
});
