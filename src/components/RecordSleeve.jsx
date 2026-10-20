import { getPressing } from "../data/pressings";

// Position an unchanged source photo inside a circular window.
function VinylPhoto({ pressing }) {
  const [x, y, width, height] = pressing.crop;
  return <img className="vinyl-photo" src={pressing.artwork} alt="" loading="lazy" style={{
    width: `${10000 / width}%`, height: `${10000 / height}%`,
    left: `${-100 * x / width}%`, top: `${-100 * y / height}%`,
  }} />;
}

export default function RecordSleeve({ id, title, artist, cover }) {
  const pressing = getPressing(id);
  return (
    <span className={`record-sleeve vinyl-${pressing.colour}${pressing.available ? " has-vinyl" : " sleeve-only"}`}>
      {pressing.available && <span className="vinyl-record" aria-hidden="true">
        <span className={`vinyl-disc${pressing.artwork ? " has-photo" : ""}${pressing.mode === "disc" ? " is-photographed-disc" : ""}`}>
          {pressing.mode === "disc" ? <VinylPhoto pressing={pressing} /> : <span className="vinyl-label">{pressing.artwork && <VinylPhoto pressing={pressing} />}</span>}
        </span>
      </span>}
      <img className="record-cover" src={cover} alt={`${title} album cover by ${artist}`} loading="lazy" width="600" height="600" />
    </span>
  );
}
