import { useState } from "react";
import type { ReviewItem, ReviewResponse } from "../types";

interface ReviewProps {
  review: ReviewResponse;
  onEdit: (item: ReviewItem) => void;
  onSubmit: () => void;
}

export default function Review({ review, onEdit, onSubmit }: ReviewProps) {
  const [viewMode, setViewMode] = useState<"patient" | "data">("patient");
  const [copied, setCopied] = useState(false);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(review.export, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const answeredCount = review.sections.reduce(
    (acc, sec) => acc + sec.items.filter((it) => !it.skipped).length,
    0
  );

  return (
    <div className="review">
      <div className="review-head">
        <div className="review-badge-row">
          <span className="review-status-badge">✓ Complete</span>
          <span className="review-time-badge">{answeredCount} Answers Logged</span>
        </div>
        <h2 className="review-title">Review Your Intake Profile</h2>
        <p className="muted">Please review your answers below before submitting for your doctor's consultation.</p>

        <div className="segmented-tab-control" role="tablist" aria-label="Review display format">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "patient"}
            className={`tab-btn${viewMode === "patient" ? " active" : ""}`}
            onClick={() => setViewMode("patient")}
          >
            📋 Patient View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "data"}
            className={`tab-btn${viewMode === "data" ? " active" : ""}`}
            onClick={() => setViewMode("data")}
          >
            ⚡ Structured Data (JSON)
          </button>
        </div>
      </div>

      {viewMode === "data" ? (
        <div className="data-view-container">
          <div className="data-view-toolbar">
            <span className="data-view-info">16-Question Output Schema</span>
            <button type="button" className="copy-btn" onClick={copyJson} aria-label="Copy JSON to clipboard">
              {copied ? "✓ Copied to Clipboard" : "📋 Copy JSON"}
            </button>
          </div>
          <pre className="review-json">{JSON.stringify(review.export, null, 2)}</pre>
        </div>
      ) : (
        <div className="review-sections">
          {review.sections.map((section) => {
            const activeItems = section.items.filter((i) => !i.skipped);
            return (
              <section key={section.id} className="review-section">
                <div className="review-section-header">
                  <h3 className="review-section-title">{section.title}</h3>
                  <span className="review-section-count">
                    {activeItems.length} answered
                  </span>
                </div>
                {section.items.map((item) => (
                  <div key={item.key} className={"review-item" + (item.skipped ? " skipped" : "")}>
                    <div className="review-row">
                      <span className="review-label">{item.label}</span>
                      {!item.skipped && (
                        <button
                          type="button"
                          className="review-edit"
                          onClick={() => onEdit(item)}
                          aria-label={`Edit ${item.label}`}
                        >
                          ✎ Edit
                        </button>
                      )}
                    </div>
                    {Array.isArray(item.value) ? (
                      <div className="review-tags">
                        {item.value.map((v, i) => (
                          <span key={i} className="review-tag">
                            {v}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="review-value">{item.value || (item.skipped ? "Skipped (Not applicable)" : "—")}</p>
                    )}
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <button type="button" className="primary submit-intake-btn" onClick={onSubmit}>
        Confirm & Submit Intake →
      </button>
    </div>
  );
}
