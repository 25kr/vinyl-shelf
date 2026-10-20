import { getPressing } from "../data/pressings";

export default function RecordSleeve({ id, title, artist, cover }) {
  const pressing = getPressing(id);
  return (
    <span className={`record-sleeve vinyl-${pressing.colour}${pressing.available ? " has-vinyl" : " sleeve-only"}`}>
      {pressing.available && <span className="vinyl-record" aria-hidden="true"><span className="vinyl-disc"><span className="vinyl-label" style={{ backgroundImage: `url("${cover}")` }} /></span></span>}
      <img className="record-cover" src={cover} alt={`${title} album cover by ${artist}`} loading="lazy" width="600" height="600" />
    </span>
  );
}
