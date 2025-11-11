import "./NoteHeader.css";

type NoteHeaderProps = {
    title: string;
};

export default function NoteHeader({ title }: NoteHeaderProps) {
    return (
        <div className="note-header-title">
            <p>{title}</p>
        </div>
    );
}
