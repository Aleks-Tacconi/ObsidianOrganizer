import { FaNoteSticky } from "react-icons/fa6";

import "./NoteHeader.css";

type NoteHeaderProps = {
    title: string;
};

export default function NoteHeader({ title }: NoteHeaderProps) {
    return (
        <div className="note-header-title">
            <p>
                <FaNoteSticky/>
                {title}
            </p>
        </div>
    );
}
