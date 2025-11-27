import "./Dashboard.css";
import Note from "../../Components/Note/Note.tsx";

export default function Dashboard() {
    return (
        <div className="dashboard">
            <div className="dashboard-left"></div>
            <div className="dashboard-right">
                <Note id="1" />
            </div>
        </div>
    );
}
