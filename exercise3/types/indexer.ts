export type IndexData = {
    document_frequency: number,
    inverse_document_frequency: number,
    doc_data: Map<number, {
        term_frequency: number,
        normalized_weighted_term: number,
    }>
};

export type InvertedIndex = Map<string, IndexData>;

export type URLData = {
    url: string,
    page_rank_score: number
}

export type IdToURL = Map<number,URLData>;

export type BuiltIndexResult = {inverted_index: InvertedIndex, idToURL: IdToURL};

export type CrawlData = {
    html_content: string,
    pages: string[]
}