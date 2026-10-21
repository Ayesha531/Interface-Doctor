/**
 * Geometry helpers for mapping fractional screenshot coordinates (0-1)
 * onto the rectangle actually rendered by `object-fit: contain`.
 */

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Compute the rendered bounds of an image with `object-fit: contain`
 * inside a container of the given size.
 */
export function computeContainRect(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): Rect {
  if (naturalWidth <= 0 || naturalHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }

  const imageAspect = naturalWidth / naturalHeight;
  const containerAspect = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (imageAspect > containerAspect) {
    width = containerWidth;
    height = containerWidth / imageAspect;
  } else {
    height = containerHeight;
    width = containerHeight * imageAspect;
  }

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height,
  };
}

/** Convert fractional region (0-1) to pixel offsets inside the rendered image rect. */
export function fractionToPixels(
  region: { x: number; y: number; width: number; height: number },
  rendered: Rect,
): Rect {
  return {
    left: rendered.left + region.x * rendered.width,
    top: rendered.top + region.y * rendered.height,
    width: region.width * rendered.width,
    height: region.height * rendered.height,
  };
}
