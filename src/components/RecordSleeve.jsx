import { getPressing } from "../data/pressings";

// The sleeve sits in front of the disc. CSS moves the two layers on hover/focus.
export default function RecordSleeve({ id, title, artist, cover }) {
  const pressing = getPressing(id);

  return (
    <span className={`record-sleeve vinyl-${pressing.colour}`}>
      <span className="vinyl-record" aria-hidden="true">
        <span className="vinyl-disc">
          <span className="vinyl-label" style={{ backgroundImage: `url("${cover}")` }} />
        </span>
      </span>
      <img className="record-cover" src={cover} alt={`${title} album cover by ${artist}`} loading="lazy" width="600" height="600" />
      <span className="vinyl-caption" aria-hidden="true">{pressing.verified ? "Metallic silver" : "Vinyl preview"}</span>
    </span>
  );
}
