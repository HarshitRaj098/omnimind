
import { IntelligenceOrchestrator, scrapeTool } from "../src/lib/orchestrator";

async function testOrchestratorWithTool() {
  console.log("Running orchestrator tool test...");
  const orchestrator = new IntelligenceOrchestrator(process.env.GEMINI_API_KEY || "");
  orchestrator.registerTool(scrapeTool);
  
  const result = await orchestrator.routeAndExecute("Scrape https://example.com and tell me what it says", {});
  console.log("Result:", result);
  if (result.content && result.content.includes("Example Domain")) {
    console.log("Test Passed");
  } else {
    console.error("Test Failed");
  }
}

testOrchestratorWithTool();
