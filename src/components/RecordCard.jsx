import RecordSleeve from "./RecordSleeve";

export default function RecordCard({ id, title, artist, cover }) {
  return (
    <article className="record-card">
      <a className="record-artwork" href={`#/album/${encodeURIComponent(id)}`} aria-label={`View ${title} by ${artist} and its track list`}>
        <RecordSleeve id={id} title={title} artist={artist} cover={cover} />
      </a>
    </article>
  );
}
