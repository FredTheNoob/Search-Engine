import fs from "fs"
import type { BuiltIndexResult, IdToURL, InvertedIndex } from "../types/indexer";

export async function save_inverted_index(inverted_index: InvertedIndex, idToURL: IdToURL) {
    // Create the serializable index (same as before)
    const serializableIndex = Array.from(inverted_index, ([key, value]) => ({
        term: key,
        document_frequency: value.document_frequency,
        inverse_document_frequency: value.inverse_document_frequency,
        doc_data: Object.fromEntries(value.doc_data)
    }));

    // Create the ID-to-URL mapping
    const idToURLArray = Array.from(idToURL.entries());
    

    // Save both the inverted index and the ID-to-URL mapping
    const dataToSave = {
        inverted_index: serializableIndex,
        idToURL: idToURLArray
    };

    await fs.promises.writeFile("./output/inverted_index.json", JSON.stringify(dataToSave, null, 4), 'utf-8');
}

export async function load_saved_inverted_index(): Promise<BuiltIndexResult> {
    const jsonData = await fs.promises.readFile("./output/inverted_index.json", 'utf-8');
    
    // Parse the JSON data
    const data = JSON.parse(jsonData);
    
    // Ensure the structure is as expected
    const { inverted_index: mapArray, idToURL: idToURLArray } = data;

    if (!Array.isArray(mapArray)) {
        throw new Error("Expected inverted_index to be an array, but got:", mapArray);
    }

    // Convert the loaded data back into a Map for inverted_index
    const inverted_index = new Map(mapArray.map(item => [
        item.term,
        {
            document_frequency: item.document_frequency,
            inverse_document_frequency: item.inverse_document_frequency,
            // Cast doc_data properly with a type assertion
            doc_data: new Map<number, { term_frequency: number; normalized_weighted_term: number }>(
                Object.entries(item.doc_data).map(([key, value]) => [
                    parseInt(key), value as { term_frequency: number; normalized_weighted_term: number }
                ])
            )
        }
    ]));

    // Rebuild the idToURL Map
    const idToURL: IdToURL = new Map(idToURLArray);

    return {inverted_index, idToURL};
}