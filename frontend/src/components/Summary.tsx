import type { SummaryResponse } from "../types";

export default function Summary({ summary }: { summary: SummaryResponse }) {
  return (
    <div className="summary">
      <div className="summary-sex">
        <span className="summary-sex-label">Patient</span>
        <span className="summary-sex-value">{summary.sex ?? "—"}</span>
      </div>
      {summary.sections.map((section) => (
        <section key={section.id} className="summary-section">
          <h3 className="summary-title">{section.title}</h3>
          {section.items.map((item, i) => (
            <div key={i} className={`summary-item${item.skipped ? " skipped" : ""}`}>
              <p className="summary-label">{item.label}</p>
              {Array.isArray(item.value) ? (
                <ul className="summary-list">
                  {item.value.map((line, j) => (
                    <li key={j}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="summary-value">{item.value}</p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
