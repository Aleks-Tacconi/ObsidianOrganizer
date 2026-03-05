import { useEffect, useState } from "react";
import api from "./api";
import type { ModuleInfo, Note as NoteType, PrimaryTag, Section } from "./types/api.schemas";

/**
 * The generated Section type has `notes: string` because the OpenAPI spec
 * models the serializer method field as a string. At runtime the API actually
 * returns an array of Note objects. This override keeps the rest of Section
 * intact while giving us correct types for the notes array.
 */
export type RuntimeSection = Omit<Section, "notes"> & { notes: NoteType[] };
export type RuntimeModuleInfo = Omit<ModuleInfo, "sections"> & { sections: readonly RuntimeSection[] };

export function useModuleNotes(moduleId: PrimaryTag, refresh: number) {
  const [moduleInfo, setModuleInfo] = useState<RuntimeModuleInfo | null>(null);

  useEffect(() => {
    api.get<RuntimeModuleInfo>(`module-info/${moduleId.id}/`).then((res) => {
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
