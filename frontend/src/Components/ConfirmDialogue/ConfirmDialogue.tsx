import { Paper, Dialog, DialogTitle, DialogContent, Button, Typography } from "@mui/material";
import { createPortal } from "react-dom";
import { FaCheck, FaTimes } from "react-icons/fa";

type ConfirmDialogueProps = {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  title: string;
  message: string;
};

export default function ConfirmDialogue({
  open,
  onConfirm,
  onDecline,
  title,
  message,
}: ConfirmDialogueProps) {
  return (
    <Dialog open={open} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
        <Typography>{message}</Typography>
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 5 }}>
          <Button startIcon={<FaTimes />} variant="outlined" onClick={onDecline}>
            Decline
          </Button>
          <Button startIcon={<FaCheck />} variant="contained" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
