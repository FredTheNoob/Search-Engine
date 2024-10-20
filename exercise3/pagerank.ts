import type { URLData } from "../exercise2/web_crawler/lib/types";

export function pagerank(crawled_urls: Map<string, URLData>) {
    build_probability_matrix(crawled_urls);
}

function build_probability_matrix(crawled_urls: Map<string, URLData>) {
    const probability_matrix = []
    let next_matrix_index = 0;

    const crawled_urlss = new Map<string, URLData>();
    crawled_urlss.set("https://www.dr.dk/", {html_content: "blabla", pages: ["https://tv2.dk/"]})
    crawled_urlss.set("https://tv2.dk/", {html_content: "blablaa", pages: ["https://www.dr.dk/"]})

    const url_to_index = new Map<string, number>();

    let i = 0;
    for (const [url, url_data] of crawled_urlss) {    

        


        probability_matrix.push([])

        for (const page of url_data.pages) {
            if (!url_to_index.has(page)) {
                url_to_index.set(page, probability_matrix.length - 1);
            }
        }
        i++;
    }

    console.log(probability_matrix);
    console.log(url_to_index);
    
    
    
}