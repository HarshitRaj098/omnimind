
import { IntelligenceOrchestrator } from "../src/lib/orchestrator";

async function testOrchestrator() {
  console.log("Running orchestrator test...");
  const orchestrator = new IntelligenceOrchestrator("fake-key");
  const result = await orchestrator.routeAndExecute("Hello", {});
  console.log("Result:", result);
  if (result.type === "direct") {
    console.log("Test Passed");
  } else {
    console.error("Test Failed");
  }
}

testOrchestrator();
