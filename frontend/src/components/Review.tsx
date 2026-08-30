import { useState } from "react";
import type { ReviewItem, ReviewResponse } from "../types";

interface ReviewProps {
  review: ReviewResponse;
  onEdit: (item: ReviewItem) => void;
  onSubmit: () => void;
}

export default function Review({ review, onEdit, onSubmit }: ReviewProps) {
  const [asData, setAsData] = useState(false);

  return (
    <div className="review">
      <div className="review-head">
        <h2 className="review-title">Review your answers</h2>
        <p className="muted">Confirm everything below, then submit.</p>
        <button type="button" className="ghost review-toggle" onClick={() => setAsData(!asData)}>
          {asData ? "← View as form" : "</> View as data"}
        </button>
      </div>

      {asData ? (
        <pre className="review-json">{JSON.stringify(review.export, null, 2)}</pre>
      ) : (
        <div className="review-sections">
          {review.sections.map((section) => (
            <section key={section.id} className="review-section">
              <h3 className="review-section-title">{section.title}</h3>
              {section.items.map((item) => (
                <div key={item.key} className={"review-item" + (item.skipped ? " skipped" : "")}>
                  <div className="review-row">
                    <span className="review-label">{item.label}</span>
                    {!item.skipped && (
                      <button type="button" className="review-edit" onClick={() => onEdit(item)}>
                        Edit
                      </button>
                    )}
                  </div>
                  <p className="review-value">
                    {Array.isArray(item.value) ? item.value.join(", ") : item.value}
                  </p>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      <button type="button" className="primary" onClick={onSubmit}>
        Submit
      </button>
    </div>
  );
}
