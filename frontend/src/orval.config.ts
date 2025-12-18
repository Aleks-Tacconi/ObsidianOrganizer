import { defineConfig } from "orval";

export default defineConfig({
    evo: {
        output: {
            mode: "tags",
            target: "Utils/types",
            mock: false,
            prettier: true,
            clean: true,
        },
        input: {
            target: "http://localhost:8000/api/schema",
        },
    },
});
