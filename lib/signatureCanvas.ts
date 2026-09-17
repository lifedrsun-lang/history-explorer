export const trimSignatureCanvas = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  const padding = 18;
  const sourceX = Math.max(0, minX - padding);
  const sourceY = Math.max(0, minY - padding);
  const sourceWidth = Math.min(width - sourceX, maxX - minX + 1 + padding * 2);
  const sourceHeight = Math.min(height - sourceY, maxY - minY + 1 + padding * 2);
  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = sourceWidth;
  trimmedCanvas.height = sourceHeight;
  trimmedCanvas.getContext("2d")?.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );
  return trimmedCanvas.toDataURL("image/png");
};

export const trimSignatureDataUrl = (dataUrl: string | null) => {
  if (!dataUrl) return Promise.resolve<string | null>(null);

  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(trimSignatureCanvas(canvas) || dataUrl);
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
};
