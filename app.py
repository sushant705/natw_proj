#!/usr/bin/env python3
"""Income Instability Insurance Predictor - CLI prototype.

Input CSV columns:
- date (YYYY-MM-DD)
- income (float)
- essential_expense (optional float)
"""

from __future__ import annotations

import argparse
import csv
import math
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from statistics import mean, pstdev
from typing import Dict, List, Tuple


@dataclass
class DailyRecord:
    date: datetime
    income: float
    essential_expense: float | None


def parse_csv(path: str) -> List[DailyRecord]:
    records: List[DailyRecord] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        required = {"date", "income"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError("CSV must contain columns: date, income")

        for row in reader:
            date = datetime.strptime(row["date"], "%Y-%m-%d")
            income = float(row["income"])
            essential_raw = row.get("essential_expense", "").strip() if row.get("essential_expense") is not None else ""
            essential = float(essential_raw) if essential_raw else None
            records.append(DailyRecord(date=date, income=income, essential_expense=essential))

    if not records:
        raise ValueError("No rows found in CSV")
    return sorted(records, key=lambda r: r.date)


def month_key(dt: datetime) -> str:
    return f"{dt.year:04d}-{dt.month:02d}"


def aggregate_monthly(records: List[DailyRecord]) -> Tuple[List[str], List[float], List[float]]:
    monthly_income: Dict[str, float] = defaultdict(float)
    monthly_expense: Dict[str, float] = defaultdict(float)

    for r in records:
        key = month_key(r.date)
        monthly_income[key] += r.income
        if r.essential_expense is not None:
            monthly_expense[key] += r.essential_expense

    months = sorted(monthly_income.keys())
    incomes = [monthly_income[m] for m in months]
    expenses = [monthly_expense[m] if monthly_expense[m] else 0.0 for m in months]
    return months, incomes, expenses


def sigmoid(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def instability_probability(incomes: List[float]) -> float:
    if len(incomes) < 2:
        return 0.5

    mu = mean(incomes)
    sigma = pstdev(incomes) if len(incomes) > 1 else 0.0
    latest = incomes[-1]

    if sigma == 0:
        return 0.2

    z = (mu - latest) / sigma
    base = sigmoid(z)

    # Slightly increase risk if recent trend is down.
    trend_penalty = 0.0
    if len(incomes) >= 3 and incomes[-1] < incomes[-2] < incomes[-3]:
        trend_penalty = 0.1

    return min(0.95, max(0.05, base + trend_penalty))


def recommendations(incomes: List[float], expenses: List[float], prob: float) -> List[str]:
    recs: List[str] = []
    monthly_expense = mean([e for e in expenses if e > 0]) if any(e > 0 for e in expenses) else (0.6 * mean(incomes))

    if prob >= 0.7:
        ef_months = 3.0
    elif prob >= 0.45:
        ef_months = 2.0
    else:
        ef_months = 1.5

    target_fund = monthly_expense * ef_months
    weekly_saving = target_fund / 24  # six-month ramp

    recs.append(f"Emergency fund target: ₹{target_fund:,.0f} (~{ef_months:.1f} months essential expenses).")
    recs.append(f"Suggested weekly savings: ₹{weekly_saving:,.0f} for 24 weeks.")

    if prob >= 0.7:
        recs.append("Micro-insurance timing: Buy/top-up cover this month (high instability risk).")
    elif prob >= 0.45:
        recs.append("Micro-insurance timing: Prepare to renew/top-up next month (moderate risk).")
    else:
        recs.append("Micro-insurance timing: Maintain base cover; re-evaluate monthly (lower risk).")

    return recs


def project_month_label(last_month: str, offset: int) -> str:
    year, month = map(int, last_month.split("-"))
    month += offset
    year += (month - 1) // 12
    month = ((month - 1) % 12) + 1
    return f"{year:04d}-{month:02d}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Predict income instability months for gig workers.")
    parser.add_argument("--input", required=True, help="Path to CSV input")
    parser.add_argument("--months-ahead", type=int, default=3, help="Number of forecast months")
    args = parser.parse_args()

    records = parse_csv(args.input)
    months, incomes, expenses = aggregate_monthly(records)

    mu = mean(incomes)
    sigma = pstdev(incomes) if len(incomes) > 1 else 0.0
    cv = sigma / mu if mu else 0.0
    prob = instability_probability(incomes)

    print("=== Income Instability Insurance Predictor ===")
    print(f"Data range: {months[0]} to {months[-1]}")
    print(f"Mean monthly income: ₹{mu:,.0f}")
    print(f"Monthly volatility (std dev): ₹{sigma:,.0f}")
    print(f"Coefficient of variation: {cv:.2f}")
    print()

    print("Forecast (instability probability):")
    for i in range(1, args.months_ahead + 1):
        m = project_month_label(months[-1], i)
        adjusted = min(0.95, prob + (0.02 * (i - 1)))
        tag = "HIGH" if adjusted >= 0.7 else "MEDIUM" if adjusted >= 0.45 else "LOW"
        print(f"- {m}: {adjusted:.0%} ({tag})")

    print("\nRecommended actions:")
    for rec in recommendations(incomes, expenses, prob):
        print(f"- {rec}")


if __name__ == "__main__":
    main()
