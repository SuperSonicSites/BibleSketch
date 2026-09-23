import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,ts,tsx,md}'],
  theme: { extend: {} },
  // The live app uses Tailwind Typography (prose, prose-sm, prose-lg, prose-purple) on the blog and legal pages.
  plugins: [typography],
};
