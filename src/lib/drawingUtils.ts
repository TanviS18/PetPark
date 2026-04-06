import { Stroke } from '../Pet';

export function strokesToDataURL(strokes: Stroke[] | string): string {
  let parsedStrokes: Stroke[];
  if (typeof strokes === 'string') {
    try {
      parsedStrokes = JSON.parse(strokes);
    } catch (e) {
      return '';
    }
  } else {
    parsedStrokes = strokes;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  parsedStrokes.forEach(stroke => {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.beginPath();
    if (stroke.points.length > 0) {
      // Offset by (200, 100) as in the original capture logic
      ctx.moveTo(stroke.points[0].x - 200, stroke.points[0].y - 100);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x - 200, stroke.points[i].y - 100);
      }
      ctx.stroke();
    }
  });

  return canvas.toDataURL();
}
