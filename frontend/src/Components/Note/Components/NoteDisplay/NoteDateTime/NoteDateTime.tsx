import "./NoteDateTime.css";

type NoteDateTimeProps = {
    date: Date;
};

export default function NoteDateTime({ date }: NoteDateTimeProps) {
    return (
        <div className="note-date-time">
            <p>{date.toLocaleString()}</p>
        </div>
    );
}
