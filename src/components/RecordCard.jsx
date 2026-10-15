import { useEffect, useState } from "react";


export default function RecordCard({ title, artist, cover, accent }){
    const [isCollected, setIsCollected] = useState(() =>{
        return localStorage.getItem("star-collected") === "true";
    });
    useEffect(() => {
        localStorage.setItem("star-collected", String(isCollected));
    }, [isCollected]);

    return(
        <article className="record-card">
            <img
                className="record-cover"
                src={cover}
                alt={'${title} album cover by ${artist}'}
            />

            <h2>{title}</h2>
            <p>{artist}</p>
            <span style={{ color: accent }}>
                {isCollected ? "In my collection" : "Not collected yet"}
                </span>
                <button onClick={() => setIsCollected(!isCollected)}>
                    {isCollected ? "Remove from collection" : "Add to collection"}
                </button>
        </article>
    );
}