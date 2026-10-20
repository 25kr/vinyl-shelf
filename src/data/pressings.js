// Checked 20 October 2026. A fallback preview does not confirm a physical release.
import pressingAdditions from "./pressingAdditions";

const blackPreview = {
  colour: "black",
  label: "Vinyl edition · Black disc illustration",
  available: true,
  verified: false,
  note: "Vinyl listed by the artist. Disc colour and label are illustrative; no coloured edition verified.",
};

const pressings = {
  "2hollis-star": { ...blackPreview, source: "https://shop.2hollis.life/products/star-2025-vinyl" },
  "2hollis-boy": { ...blackPreview, source: "https://shop.2hollis.life/products/boy-2024-vinyl" },
  "2hollis-2": { ...blackPreview, source: "https://shop.2hollis.life/products/2-2023-vinyl" },
  "2hollis-white_tiger": { ...blackPreview, source: "https://shop.2hollis.life/collections/frontpage" },
  "fakemink-terrified": {
    colour: "silver",
    label: "Metallic silver · UO exclusive 2LP",
    verified: true,
    available: true,
    note: "Colour based on the retailer's metallic silver edition. Disc and label artwork are illustrative.",
    source: "https://www.urbanoutfitters.com/shop/fakemink-terrified-uo-exclusive-2xlp",
  },
  "fakemink-the-boy-who-cried-terrified": { colour: "none", available: false, label: "No vinyl release confirmed", note: "Keep this album in your saved albums while you explore the music." },
  "fakemink-londons-saviour": { colour: "none", available: false, label: "No vinyl release confirmed", note: "Keep this album in your saved albums while you explore the music." },
  ...pressingAdditions,
};

export function getPressing(id) {
  return pressings[id] || { colour: "none", available: false, label: "No vinyl release confirmed" };
}
