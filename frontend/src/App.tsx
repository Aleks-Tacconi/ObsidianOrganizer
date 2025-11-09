import api from "./Utils/api";
import { useEffect } from "react";

export default function App() {
    useEffect(() => {
        api.apiGet("get_notes");
    }, [])

    return (
        <>
        </>
    )
}

