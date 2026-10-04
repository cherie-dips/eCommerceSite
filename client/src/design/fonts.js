// Fonts available in the design editor. They are loaded from Google Fonts in index.html.
// Keep in sync with FONTS in server/routes/suggestions.js.
export const FONTS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Playfair Display",
  "Bebas Neue",
  "Pacifico",
  "Roboto Slab",
  "Lobster",
];

const cssWeight = (fontStyle = "normal") => (fontStyle.includes("bold") ? "700" : "400");
const cssStyle = (fontStyle = "normal") => (fontStyle.includes("italic") ? "italic" : "normal");

// Makes sure a font is ready before it is drawn on the canvas (otherwise a fallback
// font is used for the picture).
export async function loadFont(family, fontStyle = "normal") {
  if (!document.fonts?.load) return;
  try {
    await document.fonts.load(`${cssStyle(fontStyle)} ${cssWeight(fontStyle)} 48px "${family}"`);
  } catch {
    // The text still shows in a fallback font.
  }
}

export async function loadFontsFor(layers) {
  const needed = new Set(
    layers.filter((l) => l.type === "text").map((l) => `${l.fontFamily}|${l.fontStyle || "normal"}`)
  );
  await Promise.all([...needed].map((key) => loadFont(...key.split("|"))));
}
