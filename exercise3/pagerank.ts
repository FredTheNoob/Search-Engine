import fs from "fs"
import type { CrawlData, URLData } from "./types/indexer";
import { load_saved_inverted_index, parse_input, save_inverted_index, save_pageranks } from "./components/io-indexer";

// Following the slides (slide 19)
const testInput = new Map<string,CrawlData>([
    ["https://dr.dk",{html_content: "blabla", pages: ["https://tv2.dk","https://dr2.dk"]}], // 1
    ["https://tv2.dk",{html_content: "blabla", pages: ["https://dr.dk", "https://dr2.dk", "https://dr3.dk"]}], // 2
    ["https://dr2.dk",{html_content: "blabla", pages: ["https://dr3.dk"]}], // 3
    ["https://dr3.dk",{html_content: "blabla", pages: ["https://tv2.dk"]}] // 4
])

const testInput2 = new Map<string,CrawlData>([
    ["https://dr1.dk",{html_content: "blabla", pages: ["https://dr2.dk", "https://dr4.dk"]}], // 1
    ["https://dr2.dk",{html_content: "blabla", pages: ["https://dr3.dk", "https://dr5.dk"]}], // 2
    ["https://dr3.dk",{html_content: "blabla", pages: ["https://dr1.dk"]}], // 3
    ["https://dr4.dk",{html_content: "blabla", pages: ["https://dr3.dk","https://dr8.dk"]}], // 4
    ["https://dr5.dk",{html_content: "blabla", pages: ["https://dr7.dk"]}], // 5
    ["https://dr6.dk",{html_content: "blabla", pages: ["https://dr2.dk","https://dr7.dk","https://dr8.dk"]}], // 6
    ["https://dr7.dk",{html_content: "blabla", pages: ["https://dr5.dk","https://dr9.dk"]}], // 7
    ["https://dr8.dk",{html_content: "blabla", pages: ["https://dr3.dk"]}], // 8
    ["https://dr9.dk",{html_content: "blabla", pages: []}], // 9
    ["https://dr10.dk",{html_content: "blabla", pages: ["https://dr6.dk","https://dr9.dk"]}], // 10
])

async function pagerank() {
    console.time("running pagerank algorithm")
    // const input = testInput2;
    console.log("parsing input");
    const input = await parse_input();
    console.log("constructing link ids");
    const URLToId = construct_link_ids(input);
    
    // const epsilon = 1e-6; // 0.000001 (common value)
    const epsilon = 1e-6; // 0.000001 (common value)
    const alpha = 0.1;
    
    console.log("building prob matrix");
    const prob_matrix = build_probability_matrix(input, URLToId, alpha)
    const q0: number[] = Array.from({length: URLToId.size}, (_, i) => i == 0 ? 1 : 0)
    
    let qprev = Array.from({length: URLToId.size}, (_, i) => 0);
    let qnext = q0;
    
    let steps = 1;
    
    console.log("start power iteration");
    // Power iteration
    while (!has_converged(qprev, qnext, epsilon)) {
        qprev = qnext
        qnext = multiply_matrices([qprev], prob_matrix);
        steps++;        
    }
    
    console.log("final q");
    console.log(qnext);
    console.log("steps: ", steps);
    
    const pagerankIdToURL = new Map<number, URLData>();
    
    let id = 0;
    for (const url of URLToId.keys()) {
        pagerankIdToURL.set(id, {
            url: url,
            page_rank_score: qnext[id]
        })
        id++;
    }
    
    const sum = qnext.reduce((acc, val) => acc + val, 0);
    console.log("Sum of PageRank values:", sum);
    
    console.time("saving pageranks to JSON")
    await save_pageranks(pagerankIdToURL)
    console.timeEnd("saving pageranks to JSON")
    console.timeEnd("running pagerank algorithm")
}

function construct_link_ids(inputMap: Map<string, CrawlData>) {    
    const URLToId = new Map<string,number>();
    let curr_id = 0;

    for (const url of inputMap.keys()) {
        URLToId.set(url, curr_id)
        curr_id++;
    }

    for (const input of inputMap.values()) {
        for (const page of input.pages) {
            if (!URLToId.has(page)) {
                URLToId.set(page, curr_id);
                curr_id++;
            }
        }
    }

    return URLToId;
}

function build_probability_matrix(inputMap: Map<string, CrawlData>, URLToId: Map<string, number>, alpha: number) {
    const matrix_size = URLToId.size;
    let prob_matrix: number[][] = Array.from({length: matrix_size}, (_, i) => Array.from({length: matrix_size}, (_, j) => 0));

    // Builds P
    for (const [key, value] of inputMap) {
        const linksToIds = value.pages.map((page) => URLToId.get(page)!);

        const prob_denominator = linksToIds.length;
        const row = [];        
        
        for (let i = 0; i < matrix_size; i++) {
            row[i] = (linksToIds.includes(i)) ? 1 / prob_denominator : 0;
        }

        const keyId = URLToId.get(key)!;
        prob_matrix[keyId] = row;
    }

    
    // console.log("P");
    // console.log(multiply_matrix(1-alpha, prob_matrix));
    // console.log("U");
    // console.log(construct_teleport_matrix(prob_matrix, alpha, matrix_size));
    

    prob_matrix = add_matrices(multiply_matrix(1-alpha, prob_matrix), construct_teleport_matrix(prob_matrix, alpha, matrix_size))

    // console.log("PROB MATRIX");
    // console.log(prob_matrix);

    return prob_matrix;
}

// Dangling page handling - alpha * U from the slides
function construct_teleport_matrix(prob_matrix: number[][], alpha: number, matrix_size: number): number[][] {
    const teleport_matrix: number[][] = [];

    let i = 0;
    for (const row of prob_matrix) {
        const is_dangling_page = row.every((v) => v == 0)

        if (is_dangling_page) {
            teleport_matrix[i] = Array.from({length: matrix_size}, () => 1 / matrix_size)
        }
        else {
            teleport_matrix[i] = Array.from({length: matrix_size}, () => alpha * (1 / matrix_size))
        }
        i++;
    }
    
    return teleport_matrix;
}

function multiply_matrix(constant: number, A: number[][]): number[][] {
    const result: number[][] = [];

    // Iterate through each row of the matrix
    for (const row of A) {
        const newRow: number[] = [];

        // Multiply each element in the row by the constant
        for (const value of row) {
            newRow.push(value * constant);
        }

        result.push(newRow); // Push the new row to the result matrix
    }

    return result;
}

function multiply_matrices(A: number[][], B: number[][]): number[] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;

    // Initialize the result matrix with zeros
    const result: number[][] = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));

    // Perform matrix multiplication
    for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
            for (let k = 0; k < colsA; k++) {
                result[i][j] += A[i][k] * B[k][j];
            }
        }
    }

    return result[0];
}

function add_matrices(A: number[][], B: number[][]): number[][] {
    const numRows = A.length;
    const numCols = A[0].length;

    // console.log(`prob: ${numRows},${numCols}. U: ${B.length},${B[0].length}`);
    

    // Check if matrices have the same dimensions
    if (numRows !== B.length || numCols !== B[0].length) {
        throw new Error("Matrices must have the same dimensions for addition.")
    }

    // Create a new matrix to store the result
    const result: number[][] = [];

    // Perform element-wise addition
    for (let i = 0; i < numRows; i++) {
        const row: number[] = [];
        for (let j = 0; j < numCols; j++) {
            row.push(A[i][j] + B[i][j]);
        }
        result.push(row);
    }

    return result;
}

function has_converged(v1: number[], v2: number[], epsilon: number): boolean {
    // Ensure the arrays have the same length
    if (v1.length !== v2.length) {
        throw new Error("Vectors must have the same length.");
    }

    // Calculate the Euclidean distance (L2 norm) between v1 and v2
    let sum_of_squares = 0;

    for (let i = 0; i < v1.length; i++) {
        const diff = v1[i] - v2[i];
        sum_of_squares += diff * diff;
    }

    const distance = Math.sqrt(sum_of_squares);

    // Check if the distance is smaller than the given epsilon value
    return distance < epsilon;
}

pagerank();