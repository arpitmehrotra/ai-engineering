import ollama, { type Message } from "ollama";
import { tools, getPayslip, calculateTax } from "./tools";

const MODEL = process.env.OLLAMA_MODEL ?? "qwen3:8b";
const MAX_STEPS = 10;

// name the model sees -> function your code runs
const registry: Record<string, (args: any) => string> = {
  getPayslip: (a) => getPayslip(Number(a.employeeId), a.month),
  calculateTax: (a) => calculateTax(Number(a.annualGross)),
};

export async function runAgent(question: string): Promise<string> {
  const messages: Message[] = [
    {
      role: "system",
      content:
        "You are a payroll assistant. You are in a loop and can call tools multiple times. " +
        "Use tools for all figures; never invent data. If a tool says no data exists, say so.",
    },
    { role: "user", content: question },
  ];

  for (let step = 1; step <= MAX_STEPS; step++) {
    const res = await ollama.chat({
      model: MODEL,
      messages,
      tools,
      think: true,
    });
    messages.push(res.message);

    if (res.message.thinking)
      console.log(`\n[step ${step}] thinking:`, res.message.thinking);

    const calls = res.message.tool_calls ?? [];
    if (calls.length === 0) return res.message.content; // final answer

    for (const call of calls) {
      const { name, arguments: args } = call.function;
      const fn = registry[name];
      const result = fn ? fn(args) : `Unknown tool: ${name}`;
      console.log(
        `[step ${step}] ${name}(${JSON.stringify(args)}) ->`,
        result.slice(0, 200),
      );
      messages.push({ role: "tool", tool_name: name, content: result });
    }
  }
  return "Stopped: reached the step limit without a final answer.";
}

// run: npm start -- "Why is employee 42's take-home lower in November?"
const question =
  process.argv.slice(2).join(" ") ||
  "Why is employee 42's take-home lower in November than October?";
runAgent(question).then((answer) => console.log("\nANSWER:\n", answer));
