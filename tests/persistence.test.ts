
import fs from 'fs';
import path from 'path';

async function testPersistence() {
  console.log("Running persistence test...");
  const DATA_DIR = path.join(process.cwd(), "data");
  const CONV_FILE = path.join(DATA_DIR, "conversations.json");
  
  // 1. Create a dummy conversation
  const dummyConv = {
    id: "test_conv_1",
    title: "Test Conversation",
    model: "gemini-2.5-flash",
    messages: [{ id: "1", role: "user", content: "Hello", timestamp: Date.now() }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONV_FILE, JSON.stringify([dummyConv]));
  
  // 2. Read it back
  const data = JSON.parse(fs.readFileSync(CONV_FILE, "utf-8"));
  if (data.length === 1 && data[0].id === "test_conv_1") {
    console.log("Persistence test Passed");
  } else {
    console.error("Persistence test Failed");
  }
}

testPersistence();
