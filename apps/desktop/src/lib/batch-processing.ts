import { FabricImage } from 'fabric';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BatchFilterType = 'blur' | 'sharpen' | 'grayscale' | 'sepia' | 'pixelate';

export interface BatchProcessOptions {
  filter: BatchFilterType;
  intensity?: number;
}

export interface BatchProcessResult {
  inputPath: string;
  outputPath: string;
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function applyFilterToImage(
  imgElement: HTMLImageElement,
  type: BatchFilterType,
  intensity?: number,
): Promise<string> {
  const fabricImg = await FabricImage.fromElement(imgElement);
  if (!fabricImg) throw new Error('Failed to create Fabric image');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = fabricImg as any;

  switch (type) {
    case 'blur':
      f.filters = [{ blur: intensity ?? 0.3, type: 'Blur' }];
      break;
    case 'grayscale':
      f.filters = [{ type: 'Grayscale' }];
      break;
    case 'sepia':
      f.filters = [{ type: 'Sepia' }];
      break;
    case 'pixelate':
      f.filters = [{ blocksize: Math.max(1, Math.round((intensity ?? 0.5) * 10)), type: 'Pixelate' }];
      break;
    case 'sharpen':
      f.filters = [{ type: 'Convolute', matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }];
      break;
  }

  f.applyFilters();
  return f.toDataURL({ format: 'png', quality: 1 });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a filter to an image file and return the result as a data URL.
 * Uses an offscreen canvas to avoid modifying the visible canvas.
 */
export async function processImageFile(
  inputPath: string,
  options: BatchProcessOptions,
): Promise<BatchProcessResult> {
  try {
    const { readFile, writeFile } = await import('@tauri-apps/plugin-fs');

    // Read the image file
    const imageData = await readFile(inputPath);
    const blob = new Blob([new Uint8Array(imageData)]);
    const imageUrl = URL.createObjectURL(blob);

    // Load into Fabric.js via Image element
    const imgElement = new Image();
    imgElement.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      imgElement.onload = () => resolve();
      imgElement.onerror = () => reject(new Error('Failed to load image'));
    });

    // Apply filter and get data URL
    const dataUrl = await applyFilterToImage(imgElement, options.filter, options.intensity);

    // Convert data URL to binary
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error('Failed to convert image to data URL');

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine output path
    const outputPath = inputPath.replace(/\.[^.]+$/, `_${options.filter}.png`);

    // Write output file
    await writeFile(outputPath, bytes);

    // Cleanup
    URL.revokeObjectURL(imageUrl);

    return { inputPath, outputPath, success: true };
  } catch (err) {
    return {
      inputPath,
      outputPath: '',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
