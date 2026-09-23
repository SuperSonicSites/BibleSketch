// Shared bits of the blog pages. Pure functions (no Worker imports).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "2025-12-12" -> "December 12, 2025", read from the string itself. The live listing parsed it as UTC midnight
// and showed the day before for every visitor in the Americas.
export function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
