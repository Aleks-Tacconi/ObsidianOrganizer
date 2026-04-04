export type NoteTitleLayoutInput = {
  completed: boolean;
};

export type NoteTitleLayoutResult = {
  titleRowAlignItems: "center" | "flex-start";
  iconSize: number;
  titleVariant: "h5" | "h6";
  titleLineHeight: number;
};

export function getNoteTitleLayout(input: NoteTitleLayoutInput): NoteTitleLayoutResult {
  void input;
  return {
    titleRowAlignItems: "center",
    iconSize: 18,
    titleVariant: "h5",
    titleLineHeight: 1.2,
  };
}
