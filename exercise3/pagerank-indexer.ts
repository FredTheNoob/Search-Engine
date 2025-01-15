// content-based indexer using lnc.ltc and pagerank
import fs from "fs";
import type { BuiltIndexResult, CrawlData, IdToURL, IndexData, InvertedIndex, URLData } from "./types/indexer";
import { load_pageranks, load_saved_inverted_index, parse_input, save_inverted_index, save_pageranks } from "./components/io-indexer";

import {removeStopwords, dan} from "stopword"
import { Stemmer, Languages } from 'multilingual-stemmer';

const stemmer = new Stemmer(Languages.Danish); // Porter stemming from the snowball project

async function indexer() {
    let inverted_index = new Map<string, IndexData>();
    let idToURL = await load_pageranks();

    // const crawled_urls = await parse_input();

    // // console.log(crawled_urls);
    
    // const tokens = []

    // console.time("tokenizing content...");
    // for (const input of crawled_urls.values()) tokens.push(...tokenizer(input.html_content));
    // console.timeEnd("tokenizing content...");

	// console.time("building index...");

	// const built = build_inverted_index(crawled_urls, tokens);
    // inverted_index = built.inverted_index;
    // idToURL = built.idToURL

	// console.timeEnd("building index...");
    
    // await save_inverted_index(inverted_index);
    // await save_pageranks(idToURL);

    console.time("loading saved index...");
    inverted_index = await load_saved_inverted_index()

    console.timeEnd("loading saved index...");
	
    console.time("searching...");
    const results = search("Elon Musk", inverted_index, idToURL);
    console.timeEnd("searching...");
    console.log(results);
}

function search(input: string, inverted_index: InvertedIndex, idToURL: IdToURL, top_n: number = 10) {
    const terms = tokenizer(input)

    // Step 1: Use reduce to count the occurrences of each word.
    const term_frequencies = terms.reduce((acc, term) => {
        acc[term] = (acc[term] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    // Step 2: Transform the wordCount object into the desired array structure.
    const terms_with_freq = Object.entries(term_frequencies).map(([term, freq]) => ({
        term,
        freq
    }));  

    const wt_vector = []

    for (const {term, freq} of terms_with_freq) {        
        const indexed_term = inverted_index.get(term);
        if (!indexed_term) continue;

        const tf_wt = 1 + Math.log10(freq);
        const wt = tf_wt * indexed_term.inverse_document_frequency;
        
        wt_vector.push(wt);  
    }
    

    // TODO: throw this in a function since its the exact same code as in build_inverted_index!
    const powered_wt = wt_vector.map(wt => Math.pow(wt, 2));
    const powered_wt_sum = powered_wt.reduce((sum, current) => sum + current, 0);
    const unit_vector = Math.sqrt(powered_wt_sum); 

    const document_scores = new Map<number, number>();

    let i = 0;
    for (const {term} of terms_with_freq) {        
        const indexed_term = inverted_index.get(term);
        if (!indexed_term) continue;
        
        const normalized_wt = wt_vector[i] / unit_vector;        
    
        for (const [doc_id, doc_data] of indexed_term.doc_data) {            
            const score = normalized_wt * doc_data.normalized_weighted_term;
            const existing_score = document_scores.get(doc_id);

            if (existing_score) {
                document_scores.set(doc_id, existing_score + score);
            }
            else {
                document_scores.set(doc_id, score);
            }
        }

        i++;
    }

    const sorted_document_scores = new Map([...document_scores.entries()].sort((a, b) => b[1] - a[1]));
    // console.log(sorted_document_scores);

    const alpha = 0.5;
    const results = []
    let j = 0;

    for (const [doc_id, content_score] of sorted_document_scores) {
        if (j >= top_n) break;
        const urlData = idToURL.get(doc_id)!

        const score = alpha * content_score + (1 - alpha) * (urlData.page_rank_score * 10000);

        results.push({url: urlData.url, score: score})
        j++;
    }
    return results.sort((a,b) => b.score - a.score);
}

function tokenizer(text: string): string[] {
    const tokenized_text = text
        // Convert text to lowercase for case-insensitive matching
        .toLowerCase()
        // Remove unwanted punctuation but keep letters, numbers, and whitespace (supports æ, ø, å, etc.)
        .replace(/[^\p{L}\p{N}\s]/gu, '') // '\p{L}' matches any letter, '\p{N}' matches any number, 'u' flag for Unicode
        // Split by whitespace to get individual words
        .split(/\s+/)
        // Filter out empty strings (if any)
        .filter(token => token.length > 0)

    const no_stop_words = removeStopwords(tokenized_text, dan);
    const stemmed_text = no_stop_words.map((word) => stemmer.stem(word));

    return stemmed_text;
}

function build_inverted_index(crawled_urls: Map<string, CrawlData>, tokens: string[]): BuiltIndexResult {
    const inverted_index = new Map<string, IndexData>();
    const idToURL = new Map<number,URLData>();
    let doc_id = 0;

	for (const data of crawled_urls.values()) {
        const document = tokenizer(data.html_content)

		for (const token of tokens) {
			if (document.includes(token)) {
				const term_data = inverted_index.get(token);

                const term_frequency = document.filter(word => word === token).length              

				if (!term_data) {
					inverted_index.set(token, 
                        {
                            document_frequency: 1,
                            inverse_document_frequency: 0,
                            doc_data: new Map([
                                [doc_id, {
                                    term_frequency: term_frequency, 
                                    normalized_weighted_term: 0
                                }]
                            ])
                        }
                    )
                    continue;
				}

                if (!term_data.doc_data.has(doc_id)) {
                    term_data.document_frequency += 1;
                    term_data.doc_data.set(doc_id, {
                        term_frequency: term_frequency, 
                        normalized_weighted_term: 0
                    })
                }
			}
		}
		doc_id++;
	}
    
    // Using lnc.ltc
    // - lnc for query
    // - ltc for document
    for (let i = 0; i < doc_id; i++) {
        const weighted_terms = []
        for (const index_data of inverted_index.values()) {
            const doc = index_data.doc_data.get(i);
            if (!doc) continue;
            
            index_data.inverse_document_frequency = Math.log10(doc_id / index_data.document_frequency);
                
            const tf_wt = 1 + Math.log10(doc.term_frequency);
            const wt = 1 * tf_wt;

            weighted_terms.push(wt);
        }

        const powered_wt = weighted_terms.map(wt => Math.pow(wt, 2));
        const powered_wt_sum = powered_wt.reduce((sum, current) => sum + current, 0);
        const doc_length = Math.sqrt(powered_wt_sum); 

        let j = 0;
        for (const index_data of inverted_index.values()) {
            const doc = index_data.doc_data.get(i)!;
            if (!doc) continue;
            doc.normalized_weighted_term = weighted_terms[j] / doc_length;            
            j++;
        }
    }

    const urls = Array.from(crawled_urls.keys());

    for (let i = 0; i < doc_id; i++) {
        idToURL.set(i,{url: urls[i], page_rank_score: 0})
    }

    return {inverted_index, idToURL};
}

indexer();