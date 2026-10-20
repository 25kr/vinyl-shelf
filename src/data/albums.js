// Released album catalogue checked against Apple Music on 19 October 2026.
// The Boy who cried Terrified is an EP, included in Apple Music's Albums section.
// Pirouette is upcoming (11 November 2026), so it is not included yet.
// Genre labels follow each album's linked Apple Music listing (20 October 2026).
import catalogueAdditions from "./catalogueAdditions";

const albums = [
  {
    id: "2hollis-star",
    genres: ["Pop"],
    title: "star",
    artist: "2hollis",
    year: 2025,
    type: "Album",
    cover: `${import.meta.env.BASE_URL}images/star.jpg`,
    source: "https://music.apple.com/us/album/star/1803726233",
  },
  {
    id: "2hollis-boy",
    genres: ["Pop"],
    title: "boy",
    artist: "2hollis",
    year: 2024,
    type: "Album",
    cover: `${import.meta.env.BASE_URL}images/2hollis-boy.jpg`,
    source: "https://music.apple.com/us/album/boy/1746250658",
  },
  {
    id: "2hollis-2",
    genres: ["Electronic"],
    title: "2",
    artist: "2hollis",
    year: 2023,
    type: "Album",
    cover: `${import.meta.env.BASE_URL}images/2hollis-2.jpg`,
    source: "https://music.apple.com/us/album/2/1687014179",
  },
  {
    id: "2hollis-white_tiger",
    genres: ["Alternative"],
    title: "White Tiger",
    artist: "2hollis",
    year: 2022,
    type: "Album",
    cover: `${import.meta.env.BASE_URL}images/white_tiger.jpg`,
    source: "https://music.apple.com/us/album/white-tiger/1895754601",
  },
  {
    id: "fakemink-terrified",
    genres: ["Hip-Hop/Rap"],
    title: "Terrified .",
    artist: "fakemink",
    year: 2026,
    type: "Album",
    cover: `${import.meta.env.BASE_URL}images/fakemink-terrified.jpg`,
    source: "https://music.apple.com/us/album/terrified/6804863642",
  },
  {
    id: "fakemink-the-boy-who-cried-terrified",
    genres: ["Hip-Hop/Rap"],
    title: "The Boy who cried Terrified .",
    artist: "fakemink",
    year: 2026,
    type: "EP",
    cover: `${import.meta.env.BASE_URL}images/fakemink-the-boy-who-cried-terrified.jpg`,
    source: "https://music.apple.com/us/album/the-boy-who-cried-terrified/6804861821",
  },
  {
    id: "fakemink-londons-saviour",
    genres: ["Hip-Hop/Rap"],
    title: "London's Saviour",
    artist: "fakemink",
    year: 2023,
    type: "Mixtape",
    cover: `${import.meta.env.BASE_URL}images/fakemink-londons-saviour.jpg`,
    source: "https://music.apple.com/us/album/londons-saviour/6804850775",
  },
  ...catalogueAdditions,
];

export default albums;
