import { useEffect, useState } from "react";
import { Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Checkbox, FormControlLabel, Autocomplete, Stack } from "@mui/material";

import api from "../../../Utils/api";

import type { SubTag, NoteURL } from "../../../Utils/types/api.schemas";

interface Props {
    open: boolean;
    onClose: () => void;
    primaryTagId: number;
}

type NewNoteURL = Omit<NoteURL, "id">;

export default function CreateNoteDialog({ open, onClose, primaryTagId }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [completed, setCompleted] = useState(false);

    const [subtags, setSubtags] = useState<SubTag[]>([]);
    const [selectedSubtags, setSelectedSubtags] = useState<SubTag[]>([]);

    const [urls, setUrls] = useState<NewNoteURL[]>([]);
    const [urlAlias, setUrlAlias] = useState("");
    const [urlValue, setUrlValue] = useState("");

    useEffect(() => {
        api.get<SubTag[]>("subtags/").then((r) => setSubtags(r.data));
    }, []);

    const handleAddUrl = () => {
        if (!urlAlias || !urlValue) return;
        setUrls((prev) => [...prev, { alias: urlAlias, url: urlValue }]);
        setUrlAlias("");
        setUrlValue("");
    };

    const handleSubmit = async () => {
        // Create all URLs first and collect their IDs
        const urls_ids: number[] = [];
        for (const u of urls) {
            console.log(u);
            const res = await api.post<NoteURL>("urls/", u);
            urls_ids.push(res.data.id);
        }

        await api.post("notes/", {
            name,
            description,
            date: new Date().toISOString(),
            completed,
            primary_tag_id: primaryTagId,
            subtags_ids: selectedSubtags.map((s) => s.id),
            urls_ids,
        });

        // Reset all state
        setName("");
        setDescription("");
        setCompleted(false);
        setSelectedSubtags([]);
        setUrls([]);
        setUrlAlias("");
        setUrlValue("");

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Create Note</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required sx={{ marginTop: "5px" }} />
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline rows={3} />

                <Autocomplete multiple options={subtags} getOptionLabel={(o) => o.name} value={selectedSubtags} onChange={(_, v) => setSelectedSubtags(v)} renderInput={(params) => <TextField {...params} label="Subtags" />} />

                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField label="URL Alias" value={urlAlias} onChange={(e) => setUrlAlias(e.target.value)} fullWidth />
                    <TextField label="URL" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} fullWidth />
                    <Button variant="outlined" onClick={handleAddUrl}>
                        Add
                    </Button>
                </Stack>

                {urls.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        {urls.map((u, i) => (
                            <Chip key={i} label={`${u.alias} — ${u.url}`} onDelete={() => setUrls((prev) => prev.filter((_, index) => index !== i))} />
                        ))}
                    </Stack>
                )}

                <FormControlLabel control={<Checkbox checked={completed} onChange={(e) => setCompleted(e.target.checked)} />} label="Completed" />
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit}>
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}
