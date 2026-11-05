/**
 * RoomRentFinder - Demo & Sample Property Helpers
 * Detects whether a property is a demonstration listing and formats display titles cleanly.
 */

export const isDemoRoom = (room) => {
  if (!room) return false;
  const title = (room.title || "").toLowerCase();
  const desc = (room.description || "").toLowerCase();

  return (
    title.includes("[demo]") ||
    title.includes("(demo)") ||
    title.startsWith("demo:") ||
    title.includes("[sample]") ||
    desc.includes("#demo") ||
    desc.includes("demo listing")
  );
};

export const getCleanTitle = (title) => {
  if (!title) return "";
  return title
    .replace(/\[(demo|sample)\]/gi, "")
    .replace(/\((demo|sample)\)/gi, "")
    .replace(/^demo:\s*/gi, "")
    .trim();
};

