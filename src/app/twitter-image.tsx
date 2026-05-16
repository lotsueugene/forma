// Twitter card uses the same artwork as the OG image. Next.js's metadata-file
// route segment config (runtime/alt/size/contentType) must be statically
// declared in this file — it can't be re-exported from another module, so we
// declare them locally and import only the render function from the OG file.
import OpenGraphImage from './opengraph-image';

export const runtime = 'edge';
export const alt = 'Forma — the modern open-source form builder';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return OpenGraphImage();
}
