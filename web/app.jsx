const { useMemo, useState } = React;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header and at least one row.");

  const headers = lines[0].split(",").map((h) => h.trim());
  const dateIdx = headers.indexOf("date");
  const incomeIdx = headers.indexOf("income");
  const expenseIdx = headers.indexOf("essential_expense");

  if (dateIdx === -1 || incomeIdx === -1) {
    throw new Error("CSV must include date and income columns.");
  }

  return lines.slice(1).map((line, i) => {
    const parts = line.split(",").map((p) => p.trim());
    const date = new Date(parts[dateIdx]);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Invalid date at row ${i + 2}`);
    }

    const income = Number(parts[incomeIdx]);
    if (!Number.isFinite(income)) {
      throw new Error(`Invalid income at row ${i + 2}`);
    }

    let essential_expense = null;
    if (expenseIdx !== -1 && parts[expenseIdx] !== "") {
      const exp = Number(parts[expenseIdx]);
      if (!Number.isFinite(exp)) throw new Error(`Invalid essential_expense at row ${i + 2}`);
      essential_expense = exp;
    }

    return { date, income, essential_expense };
  });
}

function monthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function aggregateMonthly(rows) {
  const incomeMap = new Map();
  const expenseMap = new Map();

  rows.forEach((r) => {
    const k = monthKey(r.date);
    incomeMap.set(k, (incomeMap.get(k) || 0) + r.income);
    if (r.essential_expense != null) {
      expenseMap.set(k, (expenseMap.get(k) || 0) + r.essential_expense);
    }
  });

  const months = [...incomeMap.keys()].sort();
  const incomes = months.map((m) => incomeMap.get(m));
  const expenses = months.map((m) => expenseMap.get(m) || 0);
  return { months, incomes, expenses };
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  if (arr.length < 2) return 0;
  const mu = mean(arr);
  const variance = mean(arr.map((v) => (v - mu) ** 2));
  return Math.sqrt(variance);
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function instabilityProbability(incomes) {
  if (incomes.length < 2) return 0.5;
  const mu = mean(incomes);
  const sigma = stddev(incomes);
  const latest = incomes[incomes.length - 1];
  if (sigma === 0) return 0.2;

  const z = (mu - latest) / sigma;
  let risk = sigmoid(z);
  if (incomes.length >= 3 && incomes[incomes.length - 1] < incomes[incomes.length - 2] && incomes[incomes.length - 2] < incomes[incomes.length - 3]) {
    risk += 0.1;
  }
  return Math.max(0.05, Math.min(0.95, risk));
}

function nextMonthLabel(lastMonth, offset) {
  const [yRaw, mRaw] = lastMonth.split("-").map(Number);
  let year = yRaw;
  let month = mRaw + offset;
  year += Math.floor((month - 1) / 12);
  month = ((month - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function recommendations(incomes, expenses, prob) {
  const expenseHistory = expenses.filter((e) => e > 0);
  const monthlyExpense = expenseHistory.length ? mean(expenseHistory) : 0.6 * mean(incomes);
  const efMonths = prob >= 0.7 ? 3 : prob >= 0.45 ? 2 : 1.5;
  const targetFund = monthlyExpense * efMonths;
  const weeklySaving = targetFund / 24;

  const insurance =
    prob >= 0.7
      ? "Buy/top-up micro-insurance this month (high risk)."
      : prob >= 0.45
      ? "Prepare top-up or renewal next month (moderate risk)."
      : "Maintain base cover and re-check monthly (low risk).";

  return {
    targetFund,
    weeklySaving,
    insurance,
  };
}

const SAMPLE = `date,income,essential_expense
2025-01-03,1300,700
2025-01-08,1150,700
2025-01-14,1400,700
2025-01-21,1250,700
2025-02-02,1100,710
2025-02-09,980,710
2025-02-16,1020,710
2025-02-22,1080,710
2025-03-03,900,720
2025-03-11,950,720
2025-03-19,860,720
2025-03-27,920,720`;

function App() {
  const [csvText, setCsvText] = useState(SAMPLE);
  const [monthsAhead, setMonthsAhead] = useState(3);
  const [error, setError] = useState("");

  const computed = useMemo(() => {
    try {
      const rows = parseCSV(csvText);
      const { months, incomes, expenses } = aggregateMonthly(rows);
      const mu = mean(incomes);
      const sigma = stddev(incomes);
      const cv = mu ? sigma / mu : 0;
      const risk = instabilityProbability(incomes);
      const rec = recommendations(incomes, expenses, risk);
      const forecast = Array.from({ length: monthsAhead }, (_, i) => {
        const p = Math.min(0.95, risk + i * 0.02);
        const label = p >= 0.7 ? "HIGH" : p >= 0.45 ? "MEDIUM" : "LOW";
        return { month: nextMonthLabel(months[months.length - 1], i + 1), prob: p, label };
      });

      setError("");
      return { months, mu, sigma, cv, risk, rec, forecast };
    } catch (e) {
      setError(e.message || "Unable to parse CSV");
      return null;
    }
  }, [csvText, monthsAhead]);

  return (
    <div className="container">
      <h1>Income Instability Insurance Predictor</h1>
      <p>React web interface for gig-worker income risk forecasting and action planning.</p>

      <div className="card">
        <h2>Input CSV</h2>
        <p>Required columns: <code>date</code>, <code>income</code>. Optional: <code>essential_expense</code>.</p>
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} />
        <div className="controls" style={{ marginTop: "0.8rem" }}>
          <label>
            Forecast months
            <input type="number" min="1" max="12" value={monthsAhead} onChange={(e) => setMonthsAhead(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      {computed && (
        <>
          <div className="card grid">
            <div className="kpi">
              <div className="kpi-label">Data range</div>
              <div className="kpi-value">{computed.months[0]} → {computed.months[computed.months.length - 1]}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Mean monthly income</div>
              <div className="kpi-value">₹{computed.mu.toFixed(0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Monthly volatility (std dev)</div>
              <div className="kpi-value">₹{computed.sigma.toFixed(0)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Coefficient of variation</div>
              <div className="kpi-value">{computed.cv.toFixed(2)}</div>
            </div>
          </div>

          <div className="card">
            <h2>Forecast</h2>
            <ul>
              {computed.forecast.map((f) => (
                <li key={f.month} className={f.label.toLowerCase()}>
                  {f.month}: {(f.prob * 100).toFixed(0)}% ({f.label})
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Recommendations</h2>
            <ul>
              <li>Emergency fund target: ₹{computed.rec.targetFund.toFixed(0)}</li>
              <li>Suggested weekly savings: ₹{computed.rec.weeklySaving.toFixed(0)} for 24 weeks</li>
              <li>{computed.rec.insurance}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
