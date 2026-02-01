type ConfirmDialogueProps = {
  open: () => void;
  title: string; 
  message: string; 
};

export default function ConfirmDialogue({ open, title }: ConfirmDialogueProps) {}
