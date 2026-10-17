
import { scrapeTool } from "../src/lib/orchestrator";

async function testScraper() {
  console.log("Running scraper test...");
  const result = await scrapeTool.execute({ url: "https://example.com" }, {});
  console.log("Result:", result);
  if (result.content && result.content.includes("Example Domain")) {
    console.log("Test Passed");
  } else {
    console.error("Test Failed");
  }
}

testScraper();
