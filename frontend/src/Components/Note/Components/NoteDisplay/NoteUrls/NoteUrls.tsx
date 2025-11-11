import { FaLink } from "react-icons/fa6";

import "./NoteUrls.css";

type NoteUrlsProps = {
    urls: [string, string][];
};

export default function NoteUrls({ urls }: NoteUrlsProps) {
    return (
        <div className="note-urls">
            {urls.map((url, i) => (
                <div className="url" key={i}>
                    <FaLink color="#0080FF" />
                    <a href={url[0]} target="_blank" rel="noopener noreferrer">
                        {url[1]}
                    </a>
                </div>
            ))}
        </div>
    );
}
