export type Note = {
    id: number;
    name: string;
    description: string;
    completed: boolean;
    date: string;

    primary_tag: {
        id: number;
        name: string;
        color: string;
    } | null;

    subtags: {
        id: number;
        name: string;
        parent: number;
    }[];

    urls: {
        id: number;
        alias: string;
        url: string;
    }[];
};
