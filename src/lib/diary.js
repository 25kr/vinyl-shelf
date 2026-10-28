export const diaryStorageKey = "vinyl-shelf-listening-diary";
export function dateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateValue(date) === value;
}
export function trackId(track) { return `${track.disc}-${track.number}`; }
export function readDiary(albums, tracklists) {
  const warning = "Some saved diary data could not be read. Saving and deleting are paused to protect it. Download a backup before recovering your data.";
  try {
    const raw = localStorage.getItem(diaryStorageKey);
    const saved = JSON.parse(raw || "[]");
    if (!Array.isArray(saved)) return { entries: [], warning, raw };
    const seen = new Set();
    const entries = saved.filter(entry => {
      const valid = entry && typeof entry.id === "string" && !seen.has(entry.id)
        && albums.some(album => album.id === entry.albumId)
        && (entry.target === "album" || (tracklists[entry.albumId] || []).some(track => trackId(track) === entry.target))
        && validDate(entry.date) && typeof entry.note === "string" && typeof entry.repeat === "boolean"
        && (entry.rating === undefined || (Number.isInteger(entry.rating) && entry.rating >= 1 && entry.rating <= 5))
        && typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt));
      if (valid) seen.add(entry.id);
      return valid;
    });
    return { entries, warning: entries.length !== saved.length ? warning : "", raw };
  } catch {
    let raw = null;
    try { raw = localStorage.getItem(diaryStorageKey); } catch { /* Access can be blocked by the browser. */ }
    return { entries: [], warning, raw };
  }
}
export function downloadDiaryBackup(raw) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = "vinyl-shelf-diary-backup.json";
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
