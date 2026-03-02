import { Dialog, DialogTitle, DialogContent, Button, Typography } from "@mui/material";

type ConfirmDialogueProps = {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  title: string;
  message: string;
  backdropStyle?: React.CSSProperties;
};

export default function ConfirmDialogue({
  open,
  onConfirm,
  onDecline,
  title,
  message,
  backdropStyle,
}: ConfirmDialogueProps) {
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      BackdropProps={{ style: backdropStyle ?? { backgroundColor: "rgba(0,0,0,0.6)" } }}
      PaperProps={{
        sx: {
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "#1c1c1c",
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <Typography>{message}</Typography>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onDecline}>Decline</Button>
          <Button variant="contained" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
