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
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid date at row ${i + 2}`);

    const income = Number(parts[incomeIdx]);
    if (!Number.isFinite(income)) throw new Error(`Invalid income at row ${i + 2}`);

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function aggregateMonthly(rows) {
  const incomeMap = new Map();
  const expenseMap = new Map();

  rows.forEach((r) => {
    const k = monthKey(r.date);
    incomeMap.set(k, (incomeMap.get(k) || 0) + r.income);
    if (r.essential_expense != null) expenseMap.set(k, (expenseMap.get(k) || 0) + r.essential_expense);
  });

  const months = [...incomeMap.keys()].sort();
  return {
    months,
    incomes: months.map((m) => incomeMap.get(m)),
    expenses: months.map((m) => expenseMap.get(m) || 0),
  };
}

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
function stddev(arr) {
  if (arr.length < 2) return 0;
  const mu = mean(arr);
  return Math.sqrt(mean(arr.map((v) => (v - mu) ** 2)));
}
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function instabilityProbability(incomes) {
  if (incomes.length < 2) return 0.5;
  const mu = mean(incomes);
  const sigma = stddev(incomes);
  if (!sigma) return 0.2;

  const latest = incomes[incomes.length - 1];
  let risk = sigmoid((mu - latest) / sigma);
  if (incomes.length >= 3 && incomes.at(-1) < incomes.at(-2) && incomes.at(-2) < incomes.at(-3)) risk += 0.1;
  return Math.max(0.05, Math.min(0.95, risk));
}

function nextMonthLabel(lastMonth, offset) {
  let [year, month] = lastMonth.split("-").map(Number);
  month += offset;
  year += Math.floor((month - 1) / 12);
  month = ((month - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function recommendations(incomes, expenses, risk) {
  const expenseHistory = expenses.filter((e) => e > 0);
  const monthlyExpense = expenseHistory.length ? mean(expenseHistory) : 0.6 * mean(incomes);
  const efMonths = risk >= 0.7 ? 3 : risk >= 0.45 ? 2 : 1.5;
  const targetFund = monthlyExpense * efMonths;
  const weeklySaving = targetFund / 24;

  return {
    targetFund,
    weeklySaving,
    efMonths,
    insurance:
      risk >= 0.7
        ? "Buy or top-up micro-insurance this month (high risk window)."
        : risk >= 0.45
        ? "Prepare renewal/top-up in next 30 days (moderate risk)."
        : "Maintain base cover and review every month (lower risk).",
  };
}

function riskMeta(risk) {
  if (risk >= 0.7) return { label: "High", cls: "high" };
  if (risk >= 0.45) return { label: "Moderate", cls: "medium" };
  return { label: "Low", cls: "low" };
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

  async function onFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

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
        return { month: nextMonthLabel(months.at(-1), i + 1), prob: p, ...riskMeta(p) };
      });
      setError("");
      return { months, rows, mu, sigma, cv, risk, rec, forecast };
    } catch (e) {
      setError(e.message || "Unable to parse CSV");
      return null;
    }
  }, [csvText, monthsAhead]);

  const risk = computed?.risk || 0;
  const riskInfo = riskMeta(risk);

  return (
    <div className="container">
      <header className="hero card">
        <div>
          <p className="eyebrow">Gig-worker financial safety</p>
          <h1>Income Instability Predictor</h1>
          <p className="subtitle">Forecast unstable months and get friendly emergency-fund + insurance timing guidance.</p>
        </div>
        <div className={`risk-chip ${riskInfo.cls}`}>
          <span>Current Risk</span>
          <strong>{computed ? `${Math.round(risk * 100)}% (${riskInfo.label})` : "—"}</strong>
        </div>
      </header>

      <section className="card">
        <h2>1) Add your income data</h2>
        <p className="muted">Use columns: <code>date</code>, <code>income</code>, optional <code>essential_expense</code>.</p>

        <div className="actions-row">
          <label className="upload-btn">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={onFileUpload} hidden />
          </label>
          <button onClick={() => setCsvText(SAMPLE)}>Load sample</button>
          <button className="ghost" onClick={() => setCsvText("")}>Clear</button>
          <label className="months-control">
            Forecast months
            <input type="number" min="1" max="12" value={monthsAhead} onChange={(e) => setMonthsAhead(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          </label>
        </div>

        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="Paste your CSV here..." />
        {error && <p className="error">{error}</p>}
      </section>

      {computed && (
        <>
          <section className="grid kpi-grid">
            <article className="kpi card"><span>Records</span><strong>{computed.rows.length}</strong></article>
            <article className="kpi card"><span>Mean monthly income</span><strong>₹{computed.mu.toFixed(0)}</strong></article>
            <article className="kpi card"><span>Monthly volatility</span><strong>₹{computed.sigma.toFixed(0)}</strong></article>
            <article className="kpi card"><span>Coefficient of variation</span><strong>{computed.cv.toFixed(2)}</strong></article>
          </section>

          <section className="card">
            <h2>2) Instability forecast</h2>
            <div className="risk-meter">
              <div className={`risk-fill ${riskInfo.cls}`} style={{ width: `${Math.round(risk * 100)}%` }} />
            </div>
            <p className="muted">Data range: {computed.months[0]} → {computed.months.at(-1)}</p>

            <table>
              <thead><tr><th>Month</th><th>Instability</th><th>Level</th></tr></thead>
              <tbody>
                {computed.forecast.map((f) => (
                  <tr key={f.month}>
                    <td>{f.month}</td>
                    <td>{Math.round(f.prob * 100)}%</td>
                    <td><span className={`tag ${f.cls}`}>{f.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid rec-grid">
            <article className="card rec">
              <h3>Emergency fund</h3>
              <p className="big">₹{computed.rec.targetFund.toFixed(0)}</p>
              <p className="muted">Target for ~{computed.rec.efMonths} months essential expenses</p>
            </article>
            <article className="card rec">
              <h3>Weekly savings plan</h3>
              <p className="big">₹{computed.rec.weeklySaving.toFixed(0)} / week</p>
              <p className="muted">For a 24-week runway</p>
            </article>
            <article className="card rec">
              <h3>Micro-insurance timing</h3>
              <p>{computed.rec.insurance}</p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
