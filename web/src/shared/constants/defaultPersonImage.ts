/**
 * Default image for person/player photo when none is set.
 * Passport-style silhouette (frontal head and shoulders) used across the app
 * for Avatar, PDF roster, etc.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="#9e9e9e">
  <ellipse cx="50" cy="38" rx="22" ry="26"/>
  <path d="M 22 68 C 22 52 36 42 50 42 C 64 42 78 52 78 68 L 78 120 L 22 120 Z"/>
</svg>`;

export const DEFAULT_PERSON_IMAGE_URL =
  `data:image/svg+xml,${encodeURIComponent(SVG)}`;
