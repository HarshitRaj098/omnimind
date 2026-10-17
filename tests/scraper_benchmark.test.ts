
import { scrapeTool } from "../src/lib/orchestrator";

const sites = [
  { url: "https://example.com", expectedTitle: "Example Domain" },
  { url: "https://www.google.com", expectedTitle: "Google" }
];

async function runBenchmark() {
  console.log("Running scraper benchmark...");
  let successCount = 0;
  for (const site of sites) {
    console.log(`Testing ${site.url}...`);
    const start = Date.now();
    const result = await scrapeTool.execute({ url: site.url }, {});
    const duration = Date.now() - start;
    
    if (result.content && result.content.includes(site.expectedTitle)) {
      console.log(`  Passed. Duration: ${duration}ms`);
      successCount++;
    } else {
      console.error(`  Failed. Result: ${JSON.stringify(result)}`);
    }
  }
  console.log(`Benchmark completed. Success: ${successCount}/${sites.length}`);
}

runBenchmark();
