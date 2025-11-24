
import { Sketch } from '../types';

export const generateSketchSlug = (sketch: Sketch) => {
  if (!sketch.promptData) return 'bible-sketch';
  
  const { book, chapter, start_verse, end_verse } = sketch.promptData;
  let slug = `${book}-${chapter}-${start_verse}`;
  if (end_verse && end_verse > start_verse) {
      slug += `-${end_verse}`;
  }
  return slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

export const getSketchUrl = (sketch: Sketch) => {
  if (!sketch.isPublic) return '#';
  const slug = generateSketchSlug(sketch);
  return `/coloring-page/${slug}/${sketch.id}`;
};
