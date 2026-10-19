import RecordCard from "./components/RecordCard";

export default function App() {
    return (
        <main>
            <h1>My Vinyl Shelf</h1>
            <p>A home for my record collection.</p>

            <RecordCard 
            id="2hollis-star"
            title="star" 
            artist="2hollis"
            cover="/images/star.jpg" 
            accent="#e5e5e5"
            />

            <RecordCard
            id="practice-album"
            title="Practice album"
            artist="Test artist"
            cover="/images/star.jpg"
            accent="#e5e5e5"
            />
            
        </main>
    );
}