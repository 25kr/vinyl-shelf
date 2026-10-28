export default function DiaryStars({ value }) {
  const valid = Number.isInteger(value) && value >= 1 && value <= 5;
  return <div className="diary-entry-rating feed-rating" role="img" aria-label={valid ? `${value} out of 5 stars` : "Not rated"}>{valid ? [1, 2, 3, 4, 5].map(star => <span key={star} className={star <= value ? "rating-tile is-filled" : "rating-tile"} aria-hidden="true">★</span>) : <span className="feed-unrated">Not rated</span>}</div>;
}
