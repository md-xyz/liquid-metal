
/**
 * Utility to generate exportable code for the liquid metal effect
 */

import { vertexShaderSource, fragmentShaderSource } from './shaders';

interface ExportParams {
  refraction: number;
  edge: number;
  patternBlur: number;
  liquid: number;
  speed: number;
  patternScale: number;
  background: string;
  imageDataUrl?: string;
}

export function generateExportableCode(params: ExportParams): string {
  const { refraction, edge, patternBlur, liquid, speed, patternScale, background, imageDataUrl } = params;
  
  // Create background style based on selected option
  let bgStyle;
  if (background === 'metal') {
    bgStyle = 'linear-gradient(to bottom, #eee, #b8b8b8)';
  } else if (background === 'white') {
    bgStyle = 'white';
  } else if (background === 'black') {
    bgStyle = 'black';
  } else if (background === 'transparent') {
    bgStyle = 'transparent';
  } else {
    bgStyle = 'linear-gradient(to bottom, #eee, #b8b8b8)';
  }
  
  // Create the HTML/CSS/JS code for the effect
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Liquid Metal Effect</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #000;
    }
    
    #canvas-container {
      width: 480px;
      height: 480px;
      aspect-ratio: 1;
      border-radius: 1.5rem;
      overflow: hidden;
      background: ${bgStyle};
      ${background === 'transparent' ? '' : ''}
    }
    
    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <script>
    // Initialize the liquid metal effect
    document.addEventListener('DOMContentLoaded', () => {
      // Get canvas container element
      const container = document.getElementById('canvas-container');
      
      // Create canvas element
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      container.appendChild(canvas);
      
      // Get WebGL2 context
      const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
      if (!gl) {
        console.error("WebGL2 is not supported in your browser");
        return;
      }
      
      // Create shader function
      function createShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        
        return shader;
      }
      
      // Create program function
      function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error('Program linking error:', gl.getProgramInfoLog(program));
          return null;
        }
        
        return program;
      }
      
      // Vertex shader source
      const vertexShaderSource = \`${vertexShaderSource}\`;
      
      // Fragment shader source
      const fragmentShaderSource = \`${fragmentShaderSource}\`;
      
      // Create shader program
      const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
      const fragmentShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
      const program = createProgram(gl, vertexShader, fragmentShader);
      
      gl.useProgram(program);
      
      // Create vertex buffer
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      
      // Create a full-screen quad
      const positions = new Float32Array([
        -1, -1,  // bottom left
         1, -1,  // bottom right
        -1,  1,  // top left
         1,  1   // top right
      ]);
      
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      
      // Get attribute location
      const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
      
      // Get uniform locations
      const uniformLocations = {
        u_image_texture: gl.getUniformLocation(program, 'u_image_texture'),
        u_time: gl.getUniformLocation(program, 'u_time'),
        u_ratio: gl.getUniformLocation(program, 'u_ratio'),
        u_img_ratio: gl.getUniformLocation(program, 'u_img_ratio'),
        u_patternScale: gl.getUniformLocation(program, 'u_patternScale'),
        u_refraction: gl.getUniformLocation(program, 'u_refraction'),
        u_edge: gl.getUniformLocation(program, 'u_edge'),
        u_patternBlur: gl.getUniformLocation(program, 'u_patternBlur'),
        u_liquid: gl.getUniformLocation(program, 'u_liquid')
      };
      
      // Create texture
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      // Set texture parameters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      // Set parameters (from your export)
      const params = {
        refraction: ${refraction},
        edge: ${edge},
        patternBlur: ${patternBlur},
        liquid: ${liquid},
        speed: ${speed},
        patternScale: ${patternScale}
      };
      
      ${imageDataUrl ? `
      // Load user's uploaded image
      loadUserImage();
      
      function loadUserImage() {
        const img = new Image();
        img.onload = function() {
          processLogoImage(img).then(processedImageData => {
            updateTexture(processedImageData);
          });
        };
        img.src = "${imageDataUrl}";
      }` : `
      // Load example SVG logo
      loadDefaultLogo();
      
      // Function to create a simple SVG triangle logo
      function loadDefaultLogo() {
        const defaultLogo = \`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="500" height="500">
          <path d="M50 10 L90 90 L10 90 Z" fill="black"/>
        </svg>
        \`;
        
        const blob = new Blob([defaultLogo], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const img = new Image();
        img.onload = function() {
          processLogoImage(img).then(processedImageData => {
            updateTexture(processedImageData);
          });
        };
        img.src = url;
      }`}
      
      // Process logo image to create distance field
      function processLogoImage(img) {
        return new Promise((resolve) => {
          // Create canvas for processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
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
          function getFieldValue(x, y, field) {
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
                outImageData.data[outIdx + 3] = 255;
              }
            }
          }
          
          resolve(outImageData);
        });
      }
      
      // Update the WebGL texture with the processed image
      function updateTexture(imageData) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
        
        // Update uniform for image aspect ratio
        const imgRatio = imageData.width / imageData.height;
        gl.uniform1f(uniformLocations.u_img_ratio, imgRatio);
      }
      
      // Update uniforms
      function updateUniforms() {
        gl.uniform1f(uniformLocations.u_ratio, canvas.width / canvas.height);
        gl.uniform1f(uniformLocations.u_patternScale, params.patternScale);
        gl.uniform1f(uniformLocations.u_refraction, params.refraction);
        gl.uniform1f(uniformLocations.u_edge, params.edge);
        gl.uniform1f(uniformLocations.u_patternBlur, params.patternBlur);
        gl.uniform1f(uniformLocations.u_liquid, params.liquid);
        gl.uniform1i(uniformLocations.u_image_texture, 0);
      }
      
      // Initialize uniforms
      updateUniforms();
      
      // Animation
      let startTime = performance.now();
      let currentTime = 0;
      
      function animate() {
        const now = performance.now();
        const deltaTime = now - startTime;
        startTime = now;
        
        currentTime += deltaTime * params.speed;
        
        // Update time uniform
        gl.uniform1f(uniformLocations.u_time, currentTime);
        
        // Draw
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(animate);
      }
      
      // Handle window resize
      window.addEventListener('resize', () => {
        gl.viewport(0, 0, canvas.width, canvas.height);
        updateUniforms();
      });
      
      // Start animation
      animate();
    });
  </script>
</body>
</html>`;
}

export function handleExport(params: ExportParams): void {
  const code = generateExportableCode(params);
  const blob = new Blob([code], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  // Create a link and trigger the download
  const link = document.createElement('a');
  link.href = url;
  link.download = 'liquid-metal-effect.html';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
