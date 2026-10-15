import RecordCard from "./components/RecordCard";

export default function App() {
    return (
        <main>
            <h1>My Vinyl Shelf</h1>
            <p>A home for my record collection.</p>

            <RecordCard title="star" 
            artist="2hollis"
            cover="/images/star.jpg" 
            accent="#e5e5e5"
            />
        </main>
    );
}