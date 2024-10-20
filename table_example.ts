const start = Date.now();

// Simulate some work
for (let i = 0; i < 1000000; i++) {
    // Simulating work
}

const end = Date.now();
const durationInMilliseconds = end - start;
const durationInSeconds = durationInMilliseconds / 1000;

// Prepare data for the table
const data = [
    { Metric: 'Execution Time (Milliseconds)', Value: durationInMilliseconds },
    { Metric: 'Execution Time (Seconds)', Value: durationInSeconds }
];

// Display the data in a table
console.table(data);