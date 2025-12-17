import { useEffect, useState } from "react";
import { IconButton, Paper, Typography, Stack, Collapse, Container } from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown } from "react-icons/fa6";

import api from "../../Utils/api";
import Note from "../Note/Note";
import CreateNoteDialog from "../NoteDialogue/NoteDialogue";

import type { PrimaryTag, ModuleInfo } from "../../Utils/types/api.schemas";

export default function ModulePannel({ moduleId }: { moduleId: PrimaryTag }) {
    const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
    const [expandedSections, setExpandedSections] = useState<number[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        api.get<ModuleInfo>(`module-info/${moduleId.id}/`).then((res) => {
            if (res?.data) setModuleInfo(res.data);
        });
    }, [moduleId]);

    const toggleSection = (id: number) => {
        setExpandedSections((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return (
        <div style={{ width: "100vw" }}>
            <CreateNoteDialog open={open} onClose={() => setOpen(false)} primaryTagId={moduleInfo?.primary_tag.id ?? 0} />

            <IconButton onClick={() => setOpen(true)} sx={{ position: "fixed", top: 12, right: 12, zIndex: 2000 }}>
                <FaPlus />
            </IconButton>

            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    {moduleInfo?.primary_tag.name}
                </Typography>
                <Typography variant="body1" align="center" gutterBottom>
                    {moduleInfo?.description}
                </Typography>

                <Stack spacing={2} mt={2} sx={{ marginBottom: "15px" }}>
                    {moduleInfo?.sections.map((section) => (
                        <Paper key={section.id} sx={{ borderRadius: 2, p: 1, backgroundColor: "white" }} elevation={1}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ cursor: "pointer", p: 1 }} onClick={() => toggleSection(section.id)}>
                                {expandedSections.includes(section.id) ? <FaAngleDown /> : <FaAngleRight />}
                                <Typography variant="h6">{section.subtag.name}</Typography>
                            </Stack>

                            <Collapse in={expandedSections.includes(section.id)} sx={{ paddingRight: "25px", paddingBottom: "20px" }}>
                                <Stack spacing={1} mt={1} ml={4}>
                                    {section.notes.map((note) => (
                                        <Note key={note.id} id={note.id} />
                                    ))}
                                </Stack>
                            </Collapse>
                        </Paper>
                    ))}
                </Stack>
            </Container>
        </div>
    );
}
