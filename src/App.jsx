import RecordCard from "./components/RecordCard";

export default function App() {
    return (
        <main>
            <h1>My Vinyl Shelf</h1>
            <p>A home for my record collection.</p>
            <div className="record-grid">

                {<RecordCard 
                id="2hollis-star"
                title="star" 
                artist="2hollis"
                cover="/images/star.jpg" 
                accent="#e5e5e5"
                />}

                {<RecordCard
                id="2hollis-white_tiger"
                title="White Tiger"
                artist="2hollis"
                cover="/images/white_tiger.jpg"
                accent="#e5e5e5"
                />}

            </div>
        </main>
    );
}