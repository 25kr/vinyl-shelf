// Checked 20 October 2026. A fallback preview does not confirm a physical release.
const blackPreview = {
  colour: "black",
  label: "Black vinyl preview",
  verified: false,
  note: "Illustration only. A coloured pressing has not been verified for this release.",
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
    note: "Colour based on the retailer's metallic silver edition. Disc and label artwork are illustrative.",
    source: "https://www.urbanoutfitters.com/shop/fakemink-terrified-uo-exclusive-2xlp",
  },
  "fakemink-the-boy-who-cried-terrified": { ...blackPreview },
  "fakemink-londons-saviour": { ...blackPreview },
};

export function getPressing(id) {
  return pressings[id] || blackPreview;
}
