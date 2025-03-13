import React, { useRef, useEffect, useState } from 'react';
import { toast } from "sonner";
import { createShader, createProgram } from '../utils/webglUtils';
import { vertexShaderSource, fragmentShaderSource } from '../utils/shaders';
import { processLogoImage, loadDefaultLogo } from '../utils/imageProcessor';
import { handleExport } from '../utils/codeExporter';

interface EffectParams {
  refraction: number;
  edge: number;
  patternBlur: number;
  liquid: number;
  speed: number;
  patternScale: number;
  background: string;
  metalType: string;
}

const LiquidMetalEffect: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const uniformLocationsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const startTimeRef = useRef<number>(performance.now());
  const currentTimeRef = useRef<number>(0);
  const currentImageDataUrlRef = useRef<string | undefined>(undefined);

  const [params, setParams] = useState<EffectParams>({
    refraction: 0.015,
    edge: 0.4,
    patternBlur: 0.005,
    liquid: 0.07,
    speed: 0.3,
    patternScale: 2,
    background: 'metal',
    metalType: 'silver'
  });

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1000;
    canvasRef.current = canvas;
    canvasContainerRef.current.appendChild(canvas);

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      toast.error("WebGL2 is not supported in your browser");
      return;
    }
    glRef.current = gl;

    try {
      const vertexShader = createShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
      const fragShader = createShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
      const program = createProgram(gl, vertexShader, fragShader);
      
      gl.useProgram(program);
      programRef.current = program;
      
      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      
      const positions = new Float32Array([
        -1, -1,  // bottom left
         1, -1,  // bottom right
        -1,  1,  // top left
         1,  1   // top right
      ]);
      
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      
      const positionAttribLocation = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(positionAttribLocation);
      gl.vertexAttribPointer(positionAttribLocation, 2, gl.FLOAT, false, 0, 0);
      
      uniformLocationsRef.current = {
        u_image_texture: gl.getUniformLocation(program, 'u_image_texture'),
        u_time: gl.getUniformLocation(program, 'u_time'),
        u_ratio: gl.getUniformLocation(program, 'u_ratio'),
        u_img_ratio: gl.getUniformLocation(program, 'u_img_ratio'),
        u_patternScale: gl.getUniformLocation(program, 'u_patternScale'),
        u_refraction: gl.getUniformLocation(program, 'u_refraction'),
        u_edge: gl.getUniformLocation(program, 'u_edge'),
        u_patternBlur: gl.getUniformLocation(program, 'u_patternBlur'),
        u_liquid: gl.getUniformLocation(program, 'u_liquid'),
        u_metalType: gl.getUniformLocation(program, 'u_metalType')
      };
      
      const texture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      
      const defaultPixel = new Uint8Array([255, 255, 255, 255]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, defaultPixel);
      
      textureRef.current = texture;
      
      loadDefaultLogo().then(img => {
        processLogoImage(img).then(processedImageData => {
          updateTexture(processedImageData);
        });
      });
      
      startAnimation();
      
      updateUniforms();
    } catch (error) {
      console.error("WebGL initialization error:", error);
      toast.error("Failed to initialize WebGL");
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (canvasRef.current && canvasContainerRef.current) {
        canvasContainerRef.current.removeChild(canvasRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateUniforms();
    updateBackground();
  }, [params]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.clientWidth * window.devicePixelRatio;
        canvasRef.current.height = canvasRef.current.clientHeight * window.devicePixelRatio;
        
        if (glRef.current) {
          glRef.current.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
          updateUniforms();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const updateTexture = (imageData: ImageData) => {
    const gl = glRef.current;
    if (!gl || !textureRef.current) return;

    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData.data);
    
    const imgRatio = imageData.width / imageData.height;
    gl.uniform1f(uniformLocationsRef.current.u_img_ratio || 0, imgRatio);
  };

  const updateUniforms = () => {
    const gl = glRef.current;
    if (!gl || !canvasRef.current) return;

    gl.uniform1f(uniformLocationsRef.current.u_ratio || 0, canvasRef.current.width / canvasRef.current.height);
    gl.uniform1f(uniformLocationsRef.current.u_patternScale || 0, params.patternScale);
    gl.uniform1f(uniformLocationsRef.current.u_refraction || 0, params.refraction);
    gl.uniform1f(uniformLocationsRef.current.u_edge || 0, params.edge);
    gl.uniform1f(uniformLocationsRef.current.u_patternBlur || 0, params.patternBlur);
    gl.uniform1f(uniformLocationsRef.current.u_liquid || 0, params.liquid);
    gl.uniform1i(uniformLocationsRef.current.u_image_texture || 0, 0);
    
    if (params.metalType === 'dark') {
      gl.uniform1f(uniformLocationsRef.current.u_metalType || 0, 1.0);
    } else if (params.metalType === 'gold') {
      gl.uniform1f(uniformLocationsRef.current.u_metalType || 0, 2.0);
    } else {
      gl.uniform1f(uniformLocationsRef.current.u_metalType || 0, 0.0);
    }
  };

  const updateBackground = () => {
    if (!canvasContainerRef.current) return;
    
    if (params.background === 'metal') {
      if (params.metalType === 'dark') {
        canvasContainerRef.current.style.background = 'linear-gradient(to bottom, #333, #111)';
      } else if (params.metalType === 'gold') {
        canvasContainerRef.current.style.background = 'linear-gradient(to bottom, #FEC6A1, #F97316)';
      } else {
        canvasContainerRef.current.style.background = 'linear-gradient(to bottom, #eee, #b8b8b8)';
      }
    } else if (params.background === 'white') {
      canvasContainerRef.current.style.background = 'white';
    } else if (params.background === 'black') {
      canvasContainerRef.current.style.background = 'black';
    } else if (params.background === 'transparent') {
      canvasContainerRef.current.style.background = 'transparent';
    }
  };

  const startAnimation = () => {
    const animate = () => {
      const gl = glRef.current;
      if (!gl || !canvasRef.current) return;

      const now = performance.now();
      const deltaTime = now - startTimeRef.current;
      startTimeRef.current = now;
      
      currentTimeRef.current += deltaTime * params.speed;
      
      gl.uniform1f(uniformLocationsRef.current.u_time || 0, currentTimeRef.current);
      
      gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      
      currentImageDataUrlRef.current = dataUrl;
      
      const img = new Image();
      
      img.onload = function() {
        toast.promise(
          processLogoImage(img).then(processedImageData => {
            updateTexture(processedImageData);
          }),
          {
            loading: 'Processing image...',
            success: 'Image processed successfully',
            error: 'Failed to process image'
          }
        );
      };
      
      img.src = dataUrl;
    };
    
    reader.readAsDataURL(file);
  };

  const handleParamChange = (name: keyof EffectParams, value: number | string) => {
    setParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInputChange = (name: keyof Omit<EffectParams, 'background'>, value: string) => {
    const numValue = parseFloat(value);
    
    const ranges = {
      refraction: { min: 0, max: 0.06 },
      edge: { min: 0, max: 1 },
      patternBlur: { min: 0, max: 0.05 },
      liquid: { min: 0, max: 1 },
      speed: { min: 0, max: 1 },
      patternScale: { min: 1, max: 10 }
    };
    
    if (!isNaN(numValue)) {
      const range = ranges[name];
      const clampedValue = Math.max(range.min, Math.min(range.max, numValue));
      
      handleParamChange(name, clampedValue);
    }
  };

  const handleExportClick = () => {
    try {
      const exportParams = {
        ...params,
        imageDataUrl: currentImageDataUrlRef.current
      };
      handleExport(exportParams);
      toast.success('Code exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export code');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 relative overflow-y-auto">
      <div className="absolute inset-0 w-full h-full bg-black z-[-1]"></div>
      
      <div className="fade-in w-full max-w-5xl flex flex-col items-center z-10">
        <div className="mb-8 text-center">
          <h1 className="header-title">Liquid Metal Effect</h1>
          <p className="header-subtitle">Transform your logos and shapes with stunning liquid metal effects</p>
        </div>
        
        <div className="w-full flex flex-col md:flex-row gap-8 items-center justify-center">
          <div ref={canvasContainerRef} className="canvas-container shadow-xl"></div>
          
          <div className="w-full md:w-72 space-y-6 bg-black/50 backdrop-blur-xl p-6 rounded-xl border border-white/10">
            <div className="flex flex-col gap-3">
              <label className="upload-btn w-full flex items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                Upload Logo
              </label>
              <button 
                className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center justify-center"
                onClick={handleExportClick}
              >
                Export Code
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".svg,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <div>
              <span className="text-sm opacity-80 font-medium">Metal Type</span>
              <div className="flex gap-3 mt-2">
                <button 
                  className={`background-option background-silver ${params.metalType === 'silver' ? 'active' : ''}`}
                  onClick={() => handleParamChange('metalType', 'silver')}
                  title="Silver Metal"
                />
                <button 
                  className={`background-option background-dark-metal ${params.metalType === 'dark' ? 'active' : ''}`}
                  onClick={() => handleParamChange('metalType', 'dark')}
                  title="Dark Metal"
                />
                <button 
                  className={`background-option background-gold ${params.metalType === 'gold' ? 'active' : ''}`}
                  onClick={() => handleParamChange('metalType', 'gold')}
                  title="Gold Metal"
                />
              </div>
            </div>
            
            <div>
              <span className="text-sm opacity-80 font-medium">Background</span>
              <div className="flex gap-3 mt-2">
                <button 
                  className={`background-option background-metal ${params.background === 'metal' ? 'active' : ''}`}
                  onClick={() => handleParamChange('background', 'metal')}
                  title="Metal"
                />
                <button 
                  className={`background-option background-white ${params.background === 'white' ? 'active' : ''}`}
                  onClick={() => handleParamChange('background', 'white')}
                  title="White"
                />
                <button 
                  className={`background-option background-black ${params.background === 'black' ? 'active' : ''}`}
                  onClick={() => handleParamChange('background', 'black')}
                  title="Black"
                />
                <button 
                  className={`background-option background-transparent ${params.background === 'transparent' ? 'active' : ''}`}
                  onClick={() => handleParamChange('background', 'transparent')}
                  title="Transparent"
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Refraction</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="0.06" 
                  step="0.001" 
                  value={params.refraction}
                  onChange={(e) => handleParamChange('refraction', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.refraction}
                  onChange={(e) => handleInputChange('refraction', e.target.value)}
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Edge</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={params.edge}
                  onChange={(e) => handleParamChange('edge', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.edge}
                  onChange={(e) => handleInputChange('edge', e.target.value)}
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Pattern Blur</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="0.05" 
                  step="0.001" 
                  value={params.patternBlur}
                  onChange={(e) => handleParamChange('patternBlur', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.patternBlur}
                  onChange={(e) => handleInputChange('patternBlur', e.target.value)}
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Liquid</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={params.liquid}
                  onChange={(e) => handleParamChange('liquid', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.liquid}
                  onChange={(e) => handleInputChange('liquid', e.target.value)}
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Speed</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={params.speed}
                  onChange={(e) => handleParamChange('speed', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.speed}
                  onChange={(e) => handleInputChange('speed', e.target.value)}
                />
              </div>
            </div>
            
            <div className="slider-container">
              <span className="parameter-name">Pattern Scale</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="0.1" 
                  value={params.patternScale}
                  onChange={(e) => handleParamChange('patternScale', parseFloat(e.target.value))}
                  className="flex-grow"
                />
                <input
                  type="text"
                  className="w-16 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  value={params.patternScale}
                  onChange={(e) => handleInputChange('patternScale', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiquidMetalEffect;

