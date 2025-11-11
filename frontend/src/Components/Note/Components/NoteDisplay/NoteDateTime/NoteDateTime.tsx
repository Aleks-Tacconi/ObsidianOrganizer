import { FaCalendarDay } from "react-icons/fa6";

import "./NoteDateTime.css";

type NoteDateTimeProps = {
    date: Date;
};

export default function NoteDateTime({ date }: NoteDateTimeProps) {
    return (
        <div className="note-date-time">
            <p>
                <FaCalendarDay />
                {date.toLocaleString()}
            </p>
        </div>
    );
}
