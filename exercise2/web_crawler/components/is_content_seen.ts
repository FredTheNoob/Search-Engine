import type { URLData } from "../crawler";
import { near_duplicates } from "../lib/nearDuplicates";

export function is_content_seen(content: string, processed_urls: Map<URL, URLData>, SIMILARITY_THRESHOLD: number): boolean {
    for (const index_content of processed_urls.values()) {
        const jaccard = near_duplicates(content, index_content.html_content)
        if (jaccard >= SIMILARITY_THRESHOLD) return true
    }

    return false;
}