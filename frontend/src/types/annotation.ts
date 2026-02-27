export interface Tag {
    id: string;
    name: string;
    category: 'global' | 'section' | 'chunk';
    // optional color for visualization
    color?: string;
}

export interface Bookmark {
    id: string;
    time: number; // in seconds
}

export interface Chunk {
    id: string;
    startTime: number;
    endTime: number; // could be next bookmark time or video duration
    tags: Tag[];
}

export interface AnnotationData {
    globalTags: Tag[];
    sectionTags: { id: string, startTime: number, endTime: number, tags: Tag[] }[];
    bookmarks: Bookmark[];
    chunks: Chunk[]; // derived from bookmarks
}
