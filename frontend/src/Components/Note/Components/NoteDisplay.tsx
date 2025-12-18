import type { Note } from "../../../Utils/types/api.schemas";
import { Card, CardHeader, CardContent, Typography, Stack, Chip } from "@mui/material";
import { FaCalendarDay, FaLink } from "react-icons/fa6";

type NoteDisplayProps = {
    note: Note;
};

export default function NoteDisplay({ note }: NoteDisplayProps) {
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(note.date));

    return (
        <Card variant="outlined" sx={{ border: 0, margin: 0, padding: 0 }}>
            <CardHeader
                sx={{ padding: "5px", marginBottom: "12px" }}
                title={<Typography variant="h6">{note.name}</Typography>}
                subheader={
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <FaCalendarDay />
                        <Typography variant="body2">{formattedDate}</Typography>
                    </Stack>
                }
            />
            <CardContent sx={{ padding: "5px", marginBottom: 0, paddingBottom: 0 }}>
                {note.description && (
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <Typography variant="body2">{note.description}</Typography>
                    </Stack>
                )}
                {note.urls.length > 0 && (
                    <Stack direction="column" spacing={1} sx={{ marginTop: "15px" }}>
                        {note.urls.map((u, i) => (
                            <Chip
                                key={i}
                                icon={<FaLink color="#0080FF" size={16} />}
                                label={`${u.alias} (${u.url})`}
                                component="a"
                                href={u.url}
                                target="_blank"
                                clickable
                                sx={{
                                    paddingLeft: "5px",
                                    color: "#0080FF",
                                    width: "auto",
                                    justifyContent: "flex-start",
                                }}
                            />
                        ))}
                    </Stack>
                )}{" "}

            </CardContent>
        </Card>
    );
}
