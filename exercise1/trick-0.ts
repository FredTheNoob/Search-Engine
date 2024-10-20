// Simply creates the shingles as strings and find the jaccard similarity. No optimizations included

const doc1: String = "do not worry about your difficulties in mathematics";
const doc2: String = "i would not worry about your difficulties, you can easily learn what is needed.";

function nearDuplicates(doc1: String, doc2: String) {
    const shingleSize = 3;

    const shingleDoc1 = buildShingle(doc1, shingleSize);
    const shingleDoc2 = buildShingle(doc2, shingleSize);

    const similarity = jaccardSimilarity(shingleDoc1, shingleDoc2);
    console.log(`Similarity is ${similarity * 100}%.`);
}

function buildShingle(input: String, size: number): Set<String> {
    const shingle = new Set<String>();
    let index = 0;

    const sanitizedInput = input.replace(/[.,!?;():\[\]{}'"]/g, '');
    const splittedInput = sanitizedInput.split(/\s+/);

    for (const word of splittedInput) {
        const shingleSize = index+size;
        if (shingleSize > splittedInput.length) break;
        
        let shingleArr = []
        for (let i = index; i < shingleSize; i++) shingleArr.push(splittedInput[i]);

        shingle.add(shingleArr.join(" "));
        
        index++;
    }

    return shingle;
}

function jaccardSimilarity(shingle1: Set<String>, shingle2: Set<String>): number {
    const overlap = shingle1.intersection(shingle2);
    const union = shingle1.union(shingle2);

    return (overlap.size / union.size);
}

nearDuplicates(doc1, doc2);