import fs from "fs";

type PostingList = number[];
type BinaryEvaluationFunction = (list1: PostingList, list2: PostingList) => PostingList;

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
    /*
    const crawled_urls = await parse_input();
    const tokens = []

    // tokenizer
    */

    const crawled_urls = new Map<string,string>();
    const tokens = []

    crawled_urls.set("doc1", "deez nutz gottem ha xd");
    crawled_urls.set("doc2", "deez");
    crawled_urls.set("doc3", "deez nutz");
    crawled_urls.set("doc4", "gottem ha");

    for (const document of crawled_urls.values()) tokens.push(...tokenizer(document));


	construct_postings(crawled_urls, tokens);
	
	// Used for testing
	/*
	doc_id = 211;
	inverted_index.set("aalborg", [1,7,13,54])
	inverted_index.set("computer", [1,2,16,32,115])
	inverted_index.set("department", [1,2,13])
	inverted_index.set("engineer", [12,13,15,116,211])
	*/
	
	console.log(inverted_index);
	
	

	//const result = boolean_query_processor("prostitution");	
	//console.log(result);
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

/*
function boolean_query_processor(query: string): PostingList {
    const query_terms = query.split(' ');  // Split by space for now, can be enhanced
    const operators: string[] = [];
    const operands: PostingList[] = [];
    
    // Parse the query
    for (const term of query_terms) {
        if (term === "AND" || term === "OR" || term === "NOT") {
            operators.push(term);
        } else {
            operands.push(inverted_index.get(term)?.posting_list || []);
        }
    }
    
	// Process NOT operations
    while (operators.includes("NOT")) {
        const idx = operators.indexOf("NOT");
        const right = operands[idx];
	
        // Perform complement (NOT operation)
        const result = complement_posting_list(right);		
        operands.splice(idx, 1, result);
        operators.splice(idx, 1);
    }
	
    // Process OR operations first
    while (operators.includes("OR")) {
        evaluate_binary_query(operators, operands, "OR", union_posting_lists);
    }
    
    // Process AND operations
    while (operators.includes("AND")) {
        evaluate_binary_query(operators, operands, "AND", intersect_posting_lists);
    }

    return operands[0]
}

function evaluate_binary_query(operators: string[], operands: PostingList[], operator_type: "AND" | "OR", eval_function: BinaryEvaluationFunction) {
	const idx = operators.indexOf(operator_type);
	const left = operands[idx];
	const right = operands[idx + 1];
	
	// Perform intersection (AND operation)
	const result = eval_function(left, right);
	operands.splice(idx, 2, result);
	operators.splice(idx, 1);
}

// Utility functions
function union_posting_lists(list1: PostingList, list2: PostingList): PostingList {
    const result = new Set([...list1, ...list2]);
    return Array.from(result).sort((a, b) => a - b);
}

function intersect_posting_lists(list1: PostingList, list2: PostingList): PostingList {
    let i = 0, j = 0;
    const result: PostingList = [];
    
    while (i < list1.length && j < list2.length) {
        if (list1[i] === list2[j]) {
            result.push(list1[i]);
            i++;
            j++;
        } else if (list1[i] < list2[j]) {
            i++;
        } else {
            j++;
        }
    }
    return result;
}

function complement_posting_list(list: PostingList): PostingList {	
    const total_docs = Array.from({ length: doc_id }, (_, i) => i + 1);	
    return total_docs.filter(doc => !list.includes(doc));
}
*/

indexer();