
export async function processLogoImage(img: HTMLImageElement): Promise<ImageData> {
  return new Promise((resolve) => {
    // Create canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // Resize the image if needed (max 1000px)
    let width = img.width;
    let height = img.height;
    
    if (width > 1000 || height > 1000 || width < 500 || height < 500) {
      if (width > height) {
        if (width > 1000) {
          height = Math.round(1000 * height / width);
          width = 1000;
        } else if (width < 500) {
          height = Math.round(500 * height / width);
          width = 500;
        }
      } else {
        if (height > 1000) {
          width = Math.round(1000 * width / height);
          height = 1000;
        } else if (height < 500) {
          width = Math.round(500 * width / height);
          height = 500;
        }
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Draw image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Array to mark non-white/non-transparent pixels as the shape
    const shapeMask = new Array(width * height).fill(false);
    
    // Detect shape
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        // If pixel is not white and not transparent, mark as shape
        if (!((r === 255 && g === 255 && b === 255 && a === 255) || a === 0)) {
          shapeMask[y * width + x] = true;
        }
      }
    }
    
    // Detect edges of shape
    const edgeMask = new Array(width * height).fill(false);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (shapeMask[idx]) {
          // Check neighbors to detect edge
          let isEdge = false;
          
          for (let dy = -1; dy <= 1 && !isEdge; dy++) {
            for (let dx = -1; dx <= 1 && !isEdge; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx < 0 || nx >= width || ny < 0 || ny >= height || !shapeMask[ny * width + nx]) {
                isEdge = true;
              }
            }
          }
          
          if (isEdge) {
            edgeMask[idx] = true;
          }
        }
      }
    }
    
    // Compute distance field
    const distField = new Float32Array(width * height).fill(0);
    const tempField = new Float32Array(width * height).fill(0);
    
    // Function to get distance field value
    function getFieldValue(x: number, y: number, field: Float32Array): number {
      if (x < 0 || x >= width || y < 0 || y >= height || !shapeMask[y * width + x]) {
        return 0;
      }
      return field[y * width + x];
    }
    
    // Simple diffusion for distance field (300 iterations)
    for (let iter = 0; iter < 300; iter++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          
          if (!shapeMask[idx] || edgeMask[idx]) {
            tempField[idx] = 0;
            continue;
          }
          
          // Average neighbor values
          const val = 
            getFieldValue(x + 1, y, distField) +
            getFieldValue(x - 1, y, distField) +
            getFieldValue(x, y + 1, distField) +
            getFieldValue(x, y - 1, distField);
          
          tempField[idx] = (0.01 + val) / 4;
        }
      }
      
      // Update field
      for (let i = 0; i < width * height; i++) {
        distField[i] = tempField[i];
      }
    }
    
    // Find max distance value for normalization
    let maxDist = 0;
    for (let i = 0; i < width * height; i++) {
      if (distField[i] > maxDist) {
        maxDist = distField[i];
      }
    }
    
    // Create output image
    const outImageData = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const outIdx = idx * 4;
        
        if (shapeMask[idx]) {
          // Inverse square falloff for distance value
          const val = 255 * (1 - Math.pow(distField[idx] / maxDist, 2));
          
          outImageData.data[outIdx] = val;
          outImageData.data[outIdx + 1] = val;
          outImageData.data[outIdx + 2] = val;
          outImageData.data[outIdx + 3] = 255;
        } else {
          outImageData.data[outIdx] = 255;
          outImageData.data[outIdx + 1] = 255;
          outImageData.data[outIdx + 2] = 255;
          outImageData.data[outIdx + 3] = 0;
        }
      }
    }
    
    resolve(outImageData);
  });
}

export function loadDefaultLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const defaultLogo = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="500" height="500">
      <path d="M50 10 L90 90 L10 90 Z" fill="black"/>
    </svg>
    `;
    
    const blob = new Blob([defaultLogo], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    img.onload = function() {
      resolve(img);
    };
    img.src = url;
  });
}
