// 1b: Uses the same hashing algorithm with different permutation (salt) for each sketch element
const SHINGLE_SIZE = 3;
const SKETCH_SIZE = 84;

const doc1: string = "do not worry about your difficulties in mathematics";
const doc2: string = "i would not worry about your difficulties, you can easily learn what is needed.";

export function near_duplicates(doc1: string, doc2: string) {
    const shingleDoc1 = buildShingle(doc1);
    const shingleDoc2 = buildShingle(doc2);
    
    const sketchDocA = new Set<bigint>();
    const sketchDocB = new Set<bigint>();

    for (let i = 0; i < SKETCH_SIZE; i++) {
        const seed = BigInt(i);
        const bigintDoc1 = hashShingleSet(shingleDoc1, seed);
        const bigintDoc2 = hashShingleSet(shingleDoc2, seed);

        const minbigintDoc1 = findMinShingleHash(bigintDoc1);
        const minbigintDoc2 = findMinShingleHash(bigintDoc2);

        sketchDocA.add(minbigintDoc1);
        sketchDocB.add(minbigintDoc2);
    }

    return jaccardSimilarity(sketchDocA, sketchDocB);
}

function buildShingle(input: string): Set<string> {
    const shingle = new Set<string>();
    let index = 0;

    const sanitizedInput = input.replace(/[.,!?;():\[\]{}'"]/g, '');
    const splittedInput = sanitizedInput.split(/\s+/);

    for (const word of splittedInput) {
        const shingleSize = index+SHINGLE_SIZE;
        if (shingleSize > splittedInput.length) break;
        
        let shingleArr = []
        for (let i = index; i < shingleSize; i++) shingleArr.push(splittedInput[i]);

        shingle.add(shingleArr.join(" "));
        
        index++;
    }

    return shingle;
}

function jaccardSimilarity(shingle1: Set<bigint>, shingle2: Set<bigint>): number {
    const shingle1Arr = Array.from(shingle1);
    const shingle2Arr = Array.from(shingle2);

    let overlap = 0;

    for (let i = 0; i < shingle1Arr.length; i++) {
        if (shingle1Arr[i] === shingle2Arr[i]) {
            overlap++;
        }
    }
        
    return (overlap / shingle1Arr.length);
}

function hashShingle(shingle: string, seed: bigint): bigint {
    return Bun.hash.murmur64v2(shingle, seed);
}

function hashShingleSet(shingles: Set<string>, seed: bigint): Set<bigint> {
    const bigints = new Set<bigint>();
    
    shingles.forEach(shingle => {
        bigints.add(hashShingle(shingle, seed));
    });

    return bigints;
}

function findMinShingleHash(shingles: Set<bigint>): bigint {
    const shinglesArr = Array.from(shingles);

    let smallest: bigint = shingles.values().next().value as bigint;

    shinglesArr.forEach(shingle => {
        if (smallest > shingle) {
            smallest = shingle;
        }
    })

    return smallest;
}