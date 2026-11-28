import { describe, it, expect } from "vitest";
import { getPayslip, calculateTax, findEmployee } from "../src/tools";

describe("getPayslip", () => {
  it("returns both months for employee 42", () => {
    const rows = JSON.parse(getPayslip(42));
    expect(rows).toHaveLength(2);
  });

  it("filters by month", () => {
    const rows = JSON.parse(getPayslip(42, "2026-11"));
    expect(rows[0].lossOfPay).toBe(4000);
  });

  it("returns a clear error for an unknown employee", () => {
    expect(getPayslip(99)).toContain("No payslip found for employee 99");
  });
});

describe("calculateTax", () => {
  it("is zero below 4 lakh", () => {
    expect(JSON.parse(calculateTax(300000)).estimatedTax).toBe(0);
  });

  it("applies slabs correctly at 10 lakh", () => {
    // 4L–8L at 5% = 20,000; 8L–10L at 10% = 20,000
    expect(JSON.parse(calculateTax(1000000)).estimatedTax).toBe(40000);
  });
});

describe("findEmployee", () => {
  it("finds by partial name, case-insensitive", () => {
    expect(JSON.parse(findEmployee("karan"))[0].employeeId).toBe(7);
  });
  it("explains when nobody matches", () => {
    expect(findEmployee("Priya")).toContain("No employee matching");
  });
});
