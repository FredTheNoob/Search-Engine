// 1a: Uses a different hashing algorithm for each sketch element
import crypto from 'crypto';

const SHINGLE_SIZE = 3;
const SKETCH_SIZE = 5;

const doc1: string = "do not worry about your difficulties in mathematics";
const doc2: string = "i would not worry about your difficulties, you can easily learn what is needed.";

function nearDuplicates(doc1: string, doc2: string) {
    const shingleDoc1 = buildShingle(doc1);
    const shingleDoc2 = buildShingle(doc2);

    const hashAlgorithms = crypto.getHashes();
    const availableHashAlgorithms = hashAlgorithms.length;

    if (SKETCH_SIZE > availableHashAlgorithms) throw new Error(
        `There are not enough hashing algorithms available for the SKETCH_SIZE you provided, 
        please decrease your SKETCH_SIZE.\n
        SKETCH_SIZE is set to: ${SKETCH_SIZE}.\n
        Amount of hashing algorithms available are: ${availableHashAlgorithms}`)
    
    const sketchDocA = new Set<bigint>;
    const sketchDocB = new Set<bigint>;

    for (let i = 0; i < SKETCH_SIZE; i++) {
        const hashedShingleDoc1 = hashShingleSet(shingleDoc1, hashAlgorithms[i]);
        const hashedShingleDoc2 = hashShingleSet(shingleDoc2, hashAlgorithms[i]);

        const minHashedShingleDoc1 = findMinShingleHash(hashedShingleDoc1);
        const minHashedShingleDoc2 = findMinShingleHash(hashedShingleDoc2);

        sketchDocA.add(minHashedShingleDoc1);
        sketchDocB.add(minHashedShingleDoc2);
    }

    const similarity = jaccardSimilarity(sketchDocA, sketchDocB);
    console.log(`Similarity is ${similarity * 100}%.`);
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
        if (shingle1Arr[i] === shingle2Arr[i]) overlap++;
    }

    return (overlap / shingle1.size);
}

function hashShingle(shingle: string, hashAlgorithm: string): bigint {
    // Create SHA-256 hash of the input string
    const hash = crypto.createHash(hashAlgorithm).update(shingle).digest('hex');
    
    // Take the first 16 characters (64 bits) of the hash and convert to a BigInt
    const hash64 = BigInt('0x' + hash.slice(0, 16));
    
    return hash64;
}

function hashShingleSet(shingles: Set<string>, hashAlgorithm: string): Set<bigint> {
    const hashedShingles = new Set<bigint>();
    
    shingles.forEach(shingle => {
        hashedShingles.add(hashShingle(shingle, hashAlgorithm));
    });
    
    return hashedShingles;
}

function findMinShingleHash(shingles: Set<bigint>): bigint {
    if (shingles.size === 0) {
        throw new Error('Cannot find the smallest bigint in an empty set');
    }

    // Initialize `smallest` with the first value in the set (TypeScript will now understand it's a bigint)
    let smallest: bigint = shingles.values().next().value as bigint;

    for (const shingle of shingles) {
        if (shingle < smallest) {
            smallest = shingle;
        }
    }

    return smallest;
}

nearDuplicates(doc1, doc2);