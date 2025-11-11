import "./NoteDescription.css"

type NoteDescriptionProps = {
    description: string;
};

export default function NoteDescription({ description }: NoteDescriptionProps) {
    return (
        <div className="description">
            <p>{description}</p>
        </div>
    );
}
