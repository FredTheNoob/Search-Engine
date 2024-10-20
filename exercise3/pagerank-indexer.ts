// content-based indexer using lnc.ltc
import fs from "fs";

type IndexData = {
    document_frequency: number,
    inverse_document_frequency: number,
    doc_data: Map<number, {
        term_frequency: number,
        normalized_weighted_term: number,
    }>
};

const inverted_index = new Map<string, IndexData>();
let doc_id = 0;

async function indexer() {
    const crawled_urls = await parse_input();
    console.log(crawled_urls);
    
    const tokens = []

    for (const document of crawled_urls.values()) tokens.push(...tokenizer(document));

	construct_postings(crawled_urls, tokens);
	
	console.log(inverted_index);
	
    //search("deez nutz");
}

function search(input: string) {
    const terms = input.split(" ");

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
    

    // TODO: throw this in a function since its the exact same code as in construct_postings!
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
    console.log(sorted_document_scores);
}

async function parse_input(): Promise<Map<string, string>> {
    const jsonData = await fs.promises.readFile("../exercise2/output/sites.json", 'utf-8');
    const mapArray: [string, string][] = JSON.parse(jsonData);

    return new Map(mapArray);
}

function tokenizer(text: string): string[] {    
    return text
      // Convert text to lowercase for case-insensitive matching
      .toLowerCase()
      // Remove unwanted punctuation but keep letters, numbers, and whitespace (supports æ, ø, å, etc.)
      .replace(/[^\p{L}\p{N}\s]/gu, '') // '\p{L}' matches any letter, '\p{N}' matches any number, 'u' flag for Unicode
      // Split by whitespace to get individual words
      .split(/\s+/)
      // Filter out empty strings (if any)
      .filter(token => token.length > 0);
}

function construct_postings(crawled_urls: Map<string, string>, tokens: string[]) {
	for (const document of crawled_urls.values()) {
		for (const token of tokens) {
			if (document.includes(token)) {
				const term_data = inverted_index.get(token);

                const term_frequency = [...document.matchAll(new RegExp(token, 'g'))].length                

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
}

indexer();