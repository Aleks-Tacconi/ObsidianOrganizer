import "./NoteDescription.css";

import { FaTumblr } from "react-icons/fa6";

type NoteDescriptionProps = {
    description: string;
};

export default function NoteDescription({ description }: NoteDescriptionProps) {
    return (
        <div className="note-description">
            <p>
                <FaTumblr />
                {description}
            </p>
        </div>
    );
}
