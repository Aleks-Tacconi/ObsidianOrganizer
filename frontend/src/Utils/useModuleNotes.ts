import { useEffect, useState } from "react";
import api from "./api";
import type { ModuleInfo, Note as NoteType, PrimaryTag } from "./types/api.schemas";

export function useModuleNotes(moduleId: PrimaryTag, refresh: number) {
  const [moduleInfo, setModuleInfo] = useState<ModuleInfo | null>(null);

  useEffect(() => {
    api.get<ModuleInfo>(`module-info/${moduleId.id}/`).then((res) => {
      if (res?.data) setModuleInfo(res.data);
    });
  }, [moduleId, refresh]);

  const updateNote = (updated: NoteType) => {
    setModuleInfo(
      (prev) =>
        prev && {
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            notes: s.notes.map((n) => (n.id === updated.id ? updated : n)),
          })),
        },
    );
  };

  const deleteNote = (id: number) => {
    setModuleInfo(
      (prev) =>
        prev && {
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            notes: s.notes.filter((n) => n.id !== id),
          })),
        },
    );
  };

  const addOrReplaceNote = (note: NoteType) => {
    setModuleInfo(
      (prev) =>
        prev && {
          ...prev,
          sections: prev.sections.map((s) =>
            s.subtag.id === note.subtags[0]?.id
              ? { ...s, notes: [...s.notes.filter((n) => n.id !== note.id), note] }
              : s,
          ),
        },
    );
  };

  return {
    moduleInfo,
    updateNote,
    deleteNote,
    addOrReplaceNote,
  };
}
