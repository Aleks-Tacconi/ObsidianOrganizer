import { useEffect, useState } from "react";

import api from "../../Utils/api";
import Note from "../Note/Note";

import "./ModulePannel.css";

import type { PrimaryTag, ModuleInfo } from "../../Utils/types/api.schemas";

import { Divider, IconButton } from "@mui/material";
import { FaPlus, FaAngleRight, FaAngleDown } from "react-icons/fa6";

export default function ModulePannel({ moduleId }: { moduleId: PrimaryTag }) {
    const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);
    const [expandedSections, setExpandedSections] = useState<number[]>([]);
    const [open, setOpen] = useState(true);

    useEffect(() => {
        api.get<ModuleInfo>(`module-info/${moduleId.id}/`).then((res) => {
            if (res?.data) {
                setModuleInfo(res.data);
                console.log(res.data);
            }
        });
    }, [moduleId]);

    const toggleSection = (id: number) => {
        setExpandedSections((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return (
        <>
            <IconButton onClick={() => setOpen(true)} sx={{ position: "fixed", top: 12, right: 12, zIndex: 2000 }}>
                <FaPlus />
            </IconButton>

            <div style={{ width: "calc(100% - 30vw)", margin: "0 15vw" }}>
                <h2>{moduleInfo?.primary_tag.name}</h2>
                <p>{moduleInfo?.description}</p>

                <div style={{ marginTop: "20px", width: "70vw" }}>
                    {moduleInfo?.sections.map((section) => (
                        <div
                            key={section.id}
                            style={{
                                marginBottom: "10px",
                                borderRadius: "14px",
                                background: "white",
                            }}
                        >
                            <div
                                style={{
                                    padding: "2px 20px",
                                    marginBottom: "-10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                }}
                                onClick={() => toggleSection(section.id)}
                            >
                                {expandedSections.includes(section.id) ? <FaAngleDown /> : <FaAngleRight />}
                                <h3>{section.subtag.name}</h3>
                            </div>

                            {expandedSections.includes(section.id) && (
                                <>
                                    <div className="section-notes">
                                        {section.notes.map((note) => (
                                            <Note key={note.id} id={note.id} />
                                        ))}
                                    </div>
                                    <Divider />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
