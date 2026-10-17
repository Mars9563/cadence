/** Pixel rectangle on the original image, as react-easy-crop reports it. */
export type CropArea = { x: number; y: number; width: number; height: number };

/** Side of the uploaded square, in px. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Largest file accepted before cropping. */
export const AVATAR_MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** What the preset accepts (jpg, png, webp). */
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('IMAGE_UNREADABLE'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Render the chosen square of the image at AVATAR_OUTPUT_SIZE and return it
 * as a file to upload. Only this square ever leaves the browser.
 *
 * WebP where the browser can encode it, JPEG otherwise (both are allowed by
 * the preset, which converts to WebP anyway). The circle is only a preview:
 * the stored image is square, and every display crops it round.
 */
export async function cropToAvatar(imageSrc: string, area: CropArea): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const context = canvas.getContext('2d');

  if (!context) throw new Error('CANVAS_UNAVAILABLE');

  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  const webp = await canvasToBlob(canvas, 'image/webp', 0.9);

  if (webp && webp.type === 'image/webp') return webp;

  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.9);

  if (!jpeg) throw new Error('IMAGE_ENCODE_FAILED');

  return jpeg;
}
