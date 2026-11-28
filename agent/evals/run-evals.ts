import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runAgent } from "../src/agent";

type EvalCase = {
  id: string;
  question: string;
  mustInclude: string[];
  mustNotInclude?: string[];
};

const RUNS = Number(process.env.RUNS ?? 3);
const cases: EvalCase[] = JSON.parse(
  readFileSync(join(process.cwd(), "evals", "agent-loop.json"), "utf-8"),
);

function check(answer: string, c: EvalCase) {
  const missing = c.mustInclude.filter((p) => !new RegExp(p, "i").test(answer));
  const forbidden = (c.mustNotInclude ?? []).filter((p) =>
    new RegExp(p, "i").test(answer),
  );
  return {
    pass: missing.length === 0 && forbidden.length === 0,
    missing,
    forbidden,
  };
}

const results: object[] = [];
let passed = 0;
let total = 0;

for (const c of cases) {
  let casePassed = 0;
  for (let run = 1; run <= RUNS; run++) {
    const started = Date.now();
    let answer: string;
    try {
      answer = await runAgent(c.question);
    } catch (e) {
      answer = `ERROR: ${(e as Error).message}`;
    }
    const result = check(answer, c);
    total++;
    if (result.pass) {
      passed++;
      casePassed++;
    }
    results.push({
      id: c.id,
      run,
      ...result,
      seconds: (Date.now() - started) / 1000,
      answer,
    });
    if (!result.pass) {
      console.log(
        `  FAIL ${c.id} run ${run}: missing [${result.missing}] forbidden [${result.forbidden}]`,
      );
    }
  }
  console.log(`${c.id}: ${casePassed}/${RUNS}`);
}

console.log(
  `\nTOTAL: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`,
);

const dir = join(process.cwd(), "evals", "results");
mkdirSync(dir, { recursive: true });
const file = join(
  dir,
  `${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
writeFileSync(
  file,
  JSON.stringify(
    {
      model: process.env.OLLAMA_MODEL ?? "qwen3:8b",
      runs: RUNS,
      passed,
      total,
      results,
    },
    null,
    2,
  ),
);
console.log(`Saved ${file}`);
