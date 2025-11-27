import { FaCalendarDay } from "react-icons/fa6";

import "./NoteDateTime.css";

type NoteDateTimeProps = {
    date: Date;
};

export default function NoteDateTime({ date }: NoteDateTimeProps) {
    const formatted = new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);

    return (
        <div className="note-date-time">
            <p>
                <FaCalendarDay />
                {formatted}
            </p>
        </div>
    );
}
