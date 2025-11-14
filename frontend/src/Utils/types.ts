export type Note = {
    id: string;
    title: string;
    identifier_tag: string;
    identifier_color: string;
    obsidian_link_tags: string[];
    description: string;
    complete: boolean;
    datetime: Date;
    urls: [string, string][];
};
