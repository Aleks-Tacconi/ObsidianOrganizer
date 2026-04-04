import { motion } from "framer-motion";
import { Dialog, DialogTitle, DialogContent, Button, Typography } from "@mui/material";

import { dialogContentVariants } from "../../Utils/motion";

type ConfirmDialogueProps = {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  declineLabel?: string;
  backdropStyle?: React.CSSProperties;
};

export default function ConfirmDialogue({
  open,
  onConfirm,
  onDecline,
  title,
  message,
  confirmLabel = "Confirm",
  declineLabel = "Cancel",
  backdropStyle,
}: ConfirmDialogueProps) {
  return (
    <Dialog
      open={open}
      onClose={onDecline}
      maxWidth="xs"
      BackdropProps={{ style: backdropStyle ?? { backgroundColor: "rgba(0,0,0,0.6)" } }}
      PaperProps={{
        sx: {
          boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "#1c1c1c",
        },
      }}
    >
      <motion.div variants={dialogContentVariants} initial="hidden" animate="visible">
          <DialogTitle>{title}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Typography>{message}</Typography>
            <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={onDecline}>{declineLabel}</Button>
              <Button variant="outlined" color="error" onClick={onConfirm} autoFocus>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </motion.div>
    </Dialog>
  );
}
