export default function RecordCard({ title, artist, cover, accent }){
    return(
        <article className="record-card">
            <img
                className="record-cover"
                src={cover}
                alt={'${title} album cover by ${artist}'}
            />

            <h2>{title}</h2>
            <p>{artist}</p>
            <span style={{ color: accent }}> In my collection</span>
        </article>
    );
}