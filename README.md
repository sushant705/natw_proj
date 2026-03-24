# Income Instability Insurance Predictor (Prototype)

This repository now includes a **working local prototype** (CLI) for the idea:
- Analyze gig-worker income patterns
- Flag likely unstable upcoming months
- Suggest emergency-fund and micro-insurance timing actions

## What is implemented
- CSV-based income ingestion (daily records)
- Monthly income aggregation
- Volatility metrics (mean, std dev, coefficient of variation)
- Next-month instability probability estimate
- Action recommendations:
  - emergency fund target and weekly savings plan
  - micro-insurance timing based on forecast risk

## Quick start

### 1) Run with sample data
```bash
python3 app.py --input sample_income.csv --months-ahead 3
```

### 2) Use your own file
Your CSV should include:
- `date` (YYYY-MM-DD)
- `income` (number)
- optional: `essential_expense` (number)

Example:
```csv
date,income,essential_expense
2025-01-01,1200,700
2025-01-02,950,700
```

Run:
```bash
python3 app.py --input your_income.csv --months-ahead 3
```

## Notes
- This is an MVP prototype for local use.
- There is no deployed web/mobile app URL in this repo yet.

## Web interface (React)
A browser-based React interface is available in `web/`.

### Run locally
```bash
python3 -m http.server 8000
```
Then open:
- `http://localhost:8000/web/`

The UI lets you paste CSV data and get instability forecasts + recommendations instantly.
