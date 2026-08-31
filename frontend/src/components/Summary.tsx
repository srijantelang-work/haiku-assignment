import { useState } from "react";
import type { SummaryResponse } from "../types";

export default function Summary({ summary }: { summary: SummaryResponse }) {
  const [viewMode, setViewMode] = useState<"patient" | "data">("patient");
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const printSummary = () => {
    window.print();
  };

  return (
    <div className="summary-wrapper">
      <div className="summary-header-card">
        <div className="summary-sex">
          <div className="summary-sex-info">
            <span className="summary-sex-label">Patient Record</span>
            <span className="summary-sex-value">
              {summary.sex ? `${summary.sex.toUpperCase()} PATIENT` : "CLINICAL INTAKE"}
            </span>
          </div>
          <span className="summary-verified-tag">✓ Verified & Filed</span>
        </div>

        <div className="segmented-tab-control" role="tablist" aria-label="Summary display format">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "patient"}
            className={`tab-btn${viewMode === "patient" ? " active" : ""}`}
            onClick={() => setViewMode("patient")}
          >
            📋 Patient Dossier
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "data"}
            className={`tab-btn${viewMode === "data" ? " active" : ""}`}
            onClick={() => setViewMode("data")}
          >
            ⚡ Data Export (JSON)
          </button>
        </div>
      </div>

      {viewMode === "data" ? (
        <div className="data-view-container">
          <div className="data-view-toolbar">
            <span className="data-view-info">Structured Summary Export</span>
            <button type="button" className="copy-btn" onClick={copyJson} aria-label="Copy JSON">
              {copied ? "✓ Copied JSON" : "📋 Copy JSON"}
            </button>
          </div>
          <pre className="review-json">{JSON.stringify(summary, null, 2)}</pre>
        </div>
      ) : (
        <div className="summary">
          {summary.sections.map((section) => (
            <section key={section.id} className="summary-section">
              <div className="summary-section-header">
                <h3 className="summary-title">{section.title}</h3>
              </div>
              {section.items.map((item, i) => (
                <div key={i} className={`summary-item${item.skipped ? " skipped" : ""}`}>
                  <p className="summary-label">{item.label}</p>
                  {Array.isArray(item.value) ? (
                    <div className="summary-tags">
                      {item.value.map((line, j) => (
                        <span key={j} className="summary-tag">
                          {line}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="summary-value">{item.value || (item.skipped ? "Skipped (Not applicable)" : "—")}</p>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <div className="summary-actions">
        <button type="button" className="ghost print-btn" onClick={printSummary}>
          🖨️ Print / Save Record
        </button>
      </div>
    </div>
  );
}
