// import { FaHashtag } from "react-icons/fa6";
import { FaTag } from "react-icons/fa6";

import "./NoteTags.css";

type NoteTagsProps = {
    tags: string[] | null[];
    identifier_tag: string;
    identifier_color: string;
};

export default function NoteTags({ tags, identifier_tag, identifier_color }: NoteTagsProps) {
    return (
        <div className="note-tags">
            <div className="tag" style={{ backgroundColor: identifier_color }}>
                <p>
                    <FaTag /> {identifier_tag}
                </p>
            </div>

            {tags.map((t, i) => (
                <div key={i}>
                    <div className="tag secondary-tag">
                        <p>
                            <FaTag /> {t}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
