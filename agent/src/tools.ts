import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Tool } from "ollama";

type Payslip = {
  employeeId: number;
  name: string;
  month: string;
  basic: number;
  hra: number;
  specialAllowance: number;
  overtime: number;
  pfEmployee: number;
  professionalTax: number;
  tds: number;
  lossOfPay: number;
};

const payslips: Payslip[] = JSON.parse(
  readFileSync(join(process.cwd(), "data", "payslips.json"), "utf-8"),
);

export function getPayslip(employeeId: number, month?: string): string {
  const rows = payslips.filter(
    (p) => p.employeeId === employeeId && (!month || p.month === month),
  );
  if (rows.length === 0) {
    const ids = [...new Set(payslips.map((p) => p.employeeId))].join(", ");
    return `No payslip found for employee ${employeeId}${month ? ` in ${month}` : ""}. Valid IDs: ${ids}`;
  }
  return JSON.stringify(rows);
}

// Simplified slabs for practice only
export function calculateTax(annualGross: number): string {
  const slabs = [
    { upTo: 400000, rate: 0 },
    { upTo: 800000, rate: 0.05 },
    { upTo: 1200000, rate: 0.1 },
    { upTo: 1600000, rate: 0.15 },
    { upTo: Infinity, rate: 0.2 },
  ];
  let tax = 0;
  let lower = 0;
  for (const s of slabs) {
    if (annualGross > lower)
      tax += (Math.min(annualGross, s.upTo) - lower) * s.rate;
    lower = s.upTo;
  }
  return JSON.stringify({ annualGross, estimatedTax: Math.round(tax) });
}

export function findEmployee(name: string): string {
  const q = name.trim().toLowerCase();
  const people = new Map<number, string>();
  for (const p of payslips) people.set(p.employeeId, p.name);
  const matches = [...people].filter(([, n]) => n.toLowerCase().includes(q));
  if (matches.length === 0) {
    return `No employee matching "${name}". Known employees: ${[...people.values()].join(", ")}`;
  }
  return JSON.stringify(
    matches.map(([employeeId, name]) => ({ employeeId, name })),
  );
}

export const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "getPayslip",
      description:
        "Get payslip records for one employee. Omit month to get all months. Amounts are INR per month.",
      parameters: {
        type: "object",
        properties: {
          employeeId: {
            type: "number",
            description: "Numeric employee ID, e.g. 42",
          },
          month: {
            type: "string",
            description: "Month in YYYY-MM format, e.g. 2026-11",
          },
        },
        required: ["employeeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateTax",
      description:
        "Estimate yearly income tax from annual gross salary in INR.",
      parameters: {
        type: "object",
        properties: {
          annualGross: {
            type: "number",
            description: "Annual gross salary in INR",
          },
        },
        required: ["annualGross"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findEmployee",
      description:
        "Find employee IDs by full or partial name (case-insensitive). Use this first when the user gives a name instead of an ID. May return several matches; if so, ask the user which one.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: 'Full or partial name, e.g. "Karan" or "Karan Mehta"',
          },
        },
        required: ["name"],
      },
    },
  },
];
