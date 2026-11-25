/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts an SVG string into a PNG buffer (Uint8Array) for use in docx/PDF 
 * generation in the browser.
 */
export async function svgToPngBuffer(svgString: string, width: number = 400): Promise<Uint8Array | null> {
  return new Promise((resolve) => {
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspectRatio = img.height / img.width;
        canvas.width = width;
        canvas.height = width * aspectRatio;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        
        ctx.fillStyle = 'white'; // White background for transparency
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              resolve(new Uint8Array(buffer));
            });
          } else {
            resolve(null);
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Error converting SVG to PNG:', error);
      resolve(null);
    }
  });
}
