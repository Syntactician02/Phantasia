// lib/parseBudget.ts
// Parses Budget Excel sheet and computes financial health signals

import * as XLSX from "xlsx";
import { BudgetItem } from "./sampleData";

export function parseBudgetSheet(workbook: XLSX.WorkBook): BudgetItem[] {
  const sheet = workbook.Sheets["Budget"];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<{
    Item: string;
    "Budgeted Hours": number;
    "Spent Hours": number;
    "Cost Per Hour": number;
    Status: string;
  }>(sheet);

  return rows.map((r) => ({
    item: r["Item"],
    budgeted_hours: Number(r["Budgeted Hours"]) || 0,
    spent_hours: Number(r["Spent Hours"]) || 0,
    cost_per_hour: Number(r["Cost Per Hour"]) || 0,
    status: (r["Status"] as BudgetItem["status"]) ?? "Active",
  }));
}

export interface FinancialSummary {
  total_budgeted_cost: number;
  total_spent_cost: number;
  burn_percent: number;
  wasted_hours: number;
  wasted_cost: number;
  blocked_cost: number;    // money being burned on blocked work
  financial_risk: "Low" | "Medium" | "High";
  top_waste_item: string;
}

export function computeFinancialHealth(
  items: BudgetItem[],
  timeRemainingPercent: number
): FinancialSummary {
  let totalBudgeted = 0;
  let totalSpent = 0;
  let wastedHours = 0;
  let wastedCost = 0;
  let blockedCost = 0;
  let topWasteItem = "";
  let maxWaste = 0;

  for (const item of items) {
    const budgetedCost = item.budgeted_hours * item.cost_per_hour;
    const spentCost = item.spent_hours * item.cost_per_hour;

    totalBudgeted += budgetedCost;
    totalSpent += spentCost;

    // Cut items = wasted spend
    if (item.status === "Cut") {
      const waste = item.spent_hours * item.cost_per_hour;
      wastedHours += item.spent_hours;
      wastedCost += waste;
      if (waste > maxWaste) { maxWaste = waste; topWasteItem = item.item; }
    }

    // Blocked items = money burning with no output
    if (item.status === "Blocked") {
      blockedCost += spentCost;
    }
  }

  const burnPercent = totalBudgeted > 0
    ? Math.round((totalSpent / totalBudgeted) * 100)
    : 0;

  // Risk: if burn% is way higher than time used, that's a problem
  const timeUsedPercent = 100 - timeRemainingPercent;
  const overBurn = burnPercent - timeUsedPercent;

  let financial_risk: "Low" | "Medium" | "High" = "Low";
  if (overBurn > 20 || wastedCost > totalBudgeted * 0.1) financial_risk = "High";
  else if (overBurn > 10 || blockedCost > totalBudgeted * 0.05) financial_risk = "Medium";

  return {
    total_budgeted_cost: totalBudgeted,
    total_spent_cost: totalSpent,
    burn_percent: burnPercent,
    wasted_hours: wastedHours,
    wasted_cost: wastedCost,
    blocked_cost: blockedCost,
    financial_risk,
    top_waste_item: topWasteItem,
  };
}