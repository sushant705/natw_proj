# Income Instability Insurance Predictor (Prototype)

This repository includes a working MVP for the idea:
- Analyze gig-worker income patterns
- Flag likely unstable upcoming months
- Suggest emergency-fund and micro-insurance timing actions

## Current project status
- ✅ **Prototype complete** (CLI + React web UI)
- ✅ Works locally with provided sample data
- ⚠️ Not deployed to a public URL yet

## Prerequisites
- Python 3.9+ installed
- A terminal (bash, zsh, PowerShell, etc.)

## Step-by-step: run the CLI
1. Open a terminal in the project folder.
2. Run with sample data:
   ```bash
   python3 app.py --input sample_income.csv --months-ahead 3
   ```
3. You will see:
   - mean monthly income
   - volatility metrics
   - forecasted instability by month
   - emergency fund and insurance timing recommendations

## Step-by-step: run the Web UI (React)
1. Open a terminal in the project folder.
2. Start the local web server:
   ```bash
   ./run_web.sh 8000
   ```
   (or `python3 -m http.server 8000`)
3. Open your browser and go to:
   - `http://localhost:8000/web/`
4. In the UI:
   - paste CSV with headers `date,income,essential_expense` (expense optional)
   - choose forecast months (1–12)
   - view KPIs, forecast, and recommendations


## About `sample_income.csv` (important)
- It represents **one gig worker** (single person), not multiple people.
- Each row is one work-day record for that person:
  - `date` = day
  - `income` = earnings on that day
  - `essential_expense` = essential daily expense estimate used for planning
- The sample is sparse demo data (not every calendar day is present).
- Current MVP does **not** separate multiple people in one file.

If you want multi-person data, add a `person_id` column and run one person at a time (or I can upgrade the app to support grouping by `person_id`).

## Use your own CSV
Required columns:
- `date` (YYYY-MM-DD)
- `income` (number)

Optional column:
- `essential_expense` (number)

Example:
```csv
date,income,essential_expense
2025-01-01,1200,700
2025-01-02,950,700
```


## Windows note (important)
If you see:
`Python was not found; run without arguments to install from the Microsoft Store...`
it means `python3` is not available on your Windows PATH.

Use these commands in PowerShell instead:
```powershell
python app.py --input sample_income.csv --months-ahead 3
python -m http.server 8000
```

If `python` is also not found:
1. Install Python from https://www.python.org/downloads/windows/
2. During install, check **Add Python to PATH**
3. Re-open terminal and run `python --version`

Optional: disable the Microsoft Store alias for Python in:
**Settings → Apps → Advanced app settings → App execution aliases**
and turn off `python.exe` / `python3.exe` aliases.

## Troubleshooting
- **Port already in use**: use a different port, e.g. `./run_web.sh 9000`, then open `http://localhost:9000/web/`.
- **Permission denied on script**: run `chmod +x run_web.sh` once, then retry.
- **Python not found**: try `python` instead of `python3` depending on your setup.

- **`can't open file ... app.py`**: you are in the wrong folder.
  - Run `dir` (Windows) or `ls` (macOS/Linux) and confirm `app.py` is visible.
  - If not, `cd` into the project folder where `app.py` exists, then rerun:
    - `python app.py --input sample_income.csv --months-ahead 3`

- **You can see `app.py` in VS Code Explorer but terminal still says not found**:
  - Your terminal is likely one folder above (for example `...\test`) while files are inside `...\test\natw_proj`.
  - Run:
    - `cd natw_proj`
    - `python app.py --input sample_income.csv --months-ahead 3`

## Project files
- `app.py` — CLI prediction engine
- `web/` — React browser interface
- `sample_income.csv` — demo input data
- `run_web.sh` — one-command local server launcher
- `income_instability_insurance_predictor.md` — concept/design notes

## Notes
- This is an MVP prototype for local usage and validation.
- There is no deployed web/mobile app URL in this repo yet.
