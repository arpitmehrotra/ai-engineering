import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { runAgent } from "./agent";

const arg = process.argv.slice(2).join(" ").trim();

if (arg) {
  console.log("\nANSWER:\n" + (await runAgent(arg)));
} else {
  const rl = createInterface({ input: stdin, output: stdout });
  console.log('Payroll agent. Ask a question, or type "exit".');
  while (true) {
    const q = (await rl.question("\n> ")).trim();
    if (!q) continue;
    if (q.toLowerCase() === "exit") break;
    try {
      console.log("\n" + (await runAgent(q)));
    } catch (e) {
      console.error("Error:", (e as Error).message);
    }
  }
  rl.close();
}
