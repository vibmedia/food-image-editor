import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, CheckCircle, XCircle, Loader2, Download, Trash2, Camera, Sparkles, Building2 } from 'lucide-react';

// --- Types ---
type ProcessingStatus = 'idle' | 'processing' | 'success' | 'error';

interface ProcessedImage {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl: string | null;
  status: ProcessingStatus;
  error: string | null;
  progress: number;
}

const PROMPT_TEMPLATES = [
  {
    id: 'gravies',
    label: 'Category C: Gravies and Soups',
    prompt: "Cinematic food photography of in a deep ceramic bowl. Focus on the umami visual cues: enhance the specular highlights on the glossy sauce to show its rich viscosity and velveted texture. Use a 45-degree side light to define the shape of the meat chunks and vegetables within the gravy. Background: Elegant dark marble surface with soft reflections. Remove any kitchen clutter or distracting props. Ensure the dish covers 75% of the frame as per Zomato guidelines. Vibrant colors, warm tones, inviting and savory."
  },
  {
    id: 'noodles',
    label: 'Category A: Stir-Fried Noodles and Rice',
    prompt: "Professional food photography of Stir-fried, 45-degree hero angle. Maintain the exact plating and portion size of the reference photo. Enhance the Wok Hei signals: add subtle wisps of semi-transparent steam and emphasize the charred, caramelized edges of the noodles. Apply side-lighting to highlight the individual graininess of the rice and the vibrant, crisp texture of the bell peppers. Background: Replace with a dark, rustic wooden table with a soft bokeh effect. Add a single pair of high-quality wooden chopsticks resting on the right side, leading the eye toward the center. 4K resolution, commercial food magazine style, appetizing and realistic."
  },
  {
    id: 'dimsum',
    label: 'Category B: Dim Sum and Bao',
    prompt: "Studio product shot of in a traditional bamboo steamer, top-down view. Ensure the wrappers appear silken and semi-translucent, subtly revealing the filling within. Use soft backlighting to create a rim light effect on the pleats of the dough. Enhance the 'wispy' steam rising from the basket to signal peak temperature. Background: Minimalist neutral gray stone surface. Add a small, white ceramic dish of chili oil in the upper left corner to provide a color-pop. Zero distortions, realistic textures, Zomato-compliant authenticity."
  }
];

// --- Main App ---
export default function App() {
  return <MainDashboard />;
}

function MainDashboard() {
  const [customPrompt, setCustomPrompt] = useState(PROMPT_TEMPLATES[0].prompt);
  const [backgroundPrompt, setBackgroundPrompt] = useState('Clean wooden table');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ProcessedImage[]>([]);
  const isProcessingAllRef = useRef(false);

  React.useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map((file: File) => ({
        id: Math.random().toString(36).substring(7),
        file,
        originalUrl: URL.createObjectURL(file),
        processedUrl: null,
        status: 'idle' as ProcessingStatus,
        error: null,
        progress: 0,
      }));
      setImages((prev) => [...prev, ...newImages]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestaurantLogo(URL.createObjectURL(e.target.files[0]));
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const compositeLogo = async (base64Image: string, logoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Image);
          return;
        }
        ctx.drawImage(img, 0, 0);

        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.onload = () => {
          // Calculate logo size (e.g., 15% of image width)
          const logoWidth = canvas.width * 0.15;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          const padding = canvas.width * 0.03;
          
          // Bottom right corner
          const x = canvas.width - logoWidth - padding;
          const y = canvas.height - logoHeight - padding;
          
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        logo.onerror = () => resolve(base64Image); // Fallback if logo fails
        logo.src = logoUrl;
      };
      img.onerror = () => reject(new Error("Failed to load generated image for compositing"));
      img.src = base64Image;
    });
  };

  const prepareImageForAI = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate 1:1 crop (center crop)
          const size = Math.min(img.width, img.height);
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;

          // Target size max 512x512 to speed up processing and prevent timeouts
          const targetSize = Math.min(size, 512);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          
          // Draw cropped and resized image
          ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve({
            base64: dataUrl.split(',')[1],
            mimeType: 'image/jpeg'
          });
        };
        img.onerror = () => reject(new Error("Failed to load image for preparation"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const processSingleImage = async (id: string) => {
    const imageToProcess = imagesRef.current.find((img) => img.id === id);
    if (!imageToProcess || imageToProcess.status === 'processing' || imageToProcess.status === 'success') return;

    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: 'processing', error: null, progress: 10 } : img))
    );

    try {
      // Get API Key
      const apiKey = (globalThis as any).process?.env?.API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 20 } : img)));

      // Convert to base64, crop to 1:1, and resize
      const { base64: base64Data, mimeType } = await prepareImageForAI(imageToProcess.file);
      
      const fileName = imageToProcess.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');

      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 30 } : img)));

      // Build Guidelines Prompt
      const systemGuidelines = `
        Goal: High-quality, appetizing food photography for food delivery apps.
        Focus: Dish must be the hero, centered, covering ~70-75% of the frame. Leave breathing room around the dish.
        Background: ${backgroundPrompt || 'Clean and decluttered'}.
        Lighting: Natural daylight or professional soft lighting. High contrast, vibrant colors.
        Strictly Prohibited: Watermarks, text overlays, prices, people/hands, collages, raw food, logos of any kind (e.g., Zomato, Swiggy, matchboxes, branding). Do NOT add any text, logos, or brand names to the image.
      `;

      const fullPrompt = `
        You are an expert food photographer and photo editor.
        
        CRITICAL INSTRUCTION: The food in this image is "${fileName}". 
        You MUST preserve the exact food, ingredients, shape, and plating of the original image. DO NOT hallucinate or change the food itself. Your ONLY job is to enhance the lighting, textures, and replace the background.
        
        Enhance and edit the provided food image according to the following strict guidelines:
        ${systemGuidelines}

        User's specific instructions:
        ${customPrompt || "Enhance the lighting, make the food look appetizing."}
      `;

      let response;
      let lastError;
      
      // Robust Retry Logic: up to 3 attempts
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 30 + (attempt * 10) } : img)));
          
          const responsePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                  },
                },
                {
                  text: fullPrompt,
                },
              ],
            }
          });

          // 120 second timeout per attempt
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("AI processing timed out.")), 120000)
          );

          response = await Promise.race([responsePromise, timeoutPromise]) as any;
          
          if (response.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error("Image generation was blocked due to safety guidelines.");
          }
          
          break; // Success, exit retry loop
        } catch (err: any) {
          lastError = err;
          console.warn(`Attempt ${attempt} failed for image ${id}:`, err);
          if (err.message?.includes('SAFETY')) {
            break; // Don't retry safety errors
          }
          if (attempt < 3) {
            // Check if it's a rate limit error (429)
            const isRateLimit = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED') || err.status === 429;
            const delay = isRateLimit ? 10000 * attempt : 2000; // Wait 10s, 20s for rate limits
            
            setImages((prev) => prev.map((img) => (img.id === id ? { ...img, error: `Rate limit hit. Retrying in ${delay/1000}s...` } : img)));
            await new Promise(resolve => setTimeout(resolve, delay));
            setImages((prev) => prev.map((img) => (img.id === id ? { ...img, error: null } : img)));
          }
        }
      }

      if (!response) {
        throw lastError || new Error("Failed to generate image after multiple attempts.");
      }

      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 80 } : img)));

      let processedUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          processedUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!processedUrl) {
        console.error("Full AI Response:", response);
        throw new Error("No image generated by the AI. Please try a different prompt or image.");
      }

      // Add logo if available
      if (restaurantLogo) {
        setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 90 } : img)));
        processedUrl = await compositeLogo(processedUrl, restaurantLogo);
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'success', processedUrl, progress: 100 } : img
        )
      );
    } catch (error: any) {
      console.error(error);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'error', error: error.message || "Failed to process image", progress: 0 } : img
        )
      );
    }
  };

  const stopProcessing = () => {
    isProcessingAllRef.current = false;
    setIsProcessingAll(false);
  };

  const processAll = async () => {
    if (isProcessingAllRef.current) return;
    setIsProcessingAll(true);
    isProcessingAllRef.current = true;
    setGlobalProgress(0);

    // Reset errors to idle so they get picked up by the queue
    setImages(prev => prev.map(img => img.status === 'error' ? { ...img, status: 'idle', error: null, progress: 0 } : img));
    
    // Wait a tick for state to update ref
    await new Promise(resolve => setTimeout(resolve, 50));

    while (isProcessingAllRef.current) {
      const currentImages = imagesRef.current;
      const nextImage = currentImages.find(img => img.status === 'idle');
      
      if (!nextImage) {
        break; // Queue empty
      }

      await processSingleImage(nextImage.id);
      
      const updatedImages = imagesRef.current;
      const completed = updatedImages.filter(img => img.status === 'success' || img.status === 'error').length;
      setGlobalProgress((completed / updatedImages.length) * 100);

      // Add a delay between processing images to respect API rate limits
      if (isProcessingAllRef.current) {
        await new Promise(resolve => setTimeout(resolve, 4000)); // 4 second delay between images
      }
    }

    setIsProcessingAll(false);
    isProcessingAllRef.current = false;
    setTimeout(() => setGlobalProgress(0), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 flex">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-zinc-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
        <div className="p-6 border-b border-zinc-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">FoodPhoto AI</h1>
              <p className="text-xs text-zinc-500 font-medium">Listing Enhancer (1:1)</p>
            </div>
          </div>

          {/* Restaurant Logo Upload */}
          <div className="mb-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Restaurant Logo (Bottom Right)</label>
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group"
            >
              {restaurantLogo ? (
                <img src={restaurantLogo} alt="Logo" className="h-16 object-contain" />
              ) : (
                <>
                  <Building2 className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 mb-2" />
                  <span className="text-sm text-zinc-500 font-medium text-center">Upload Logo<br/><span className="text-xs font-normal">Will be added to corner</span></span>
                </>
              )}
            </div>
            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
            {restaurantLogo && (
              <button 
                onClick={(e) => { e.stopPropagation(); setRestaurantLogo(null); if(logoInputRef.current) logoInputRef.current.value = ''; }}
                className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium w-full text-center"
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col gap-6">
          {/* Background Prompt */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Initial Background</label>
            <input
              type="text"
              value={backgroundPrompt}
              onChange={(e) => setBackgroundPrompt(e.target.value)}
              placeholder="e.g., Clean wooden table, Marble top..."
              className="w-full p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Custom Prompt */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custom Instructions</label>
              <select 
                className="text-xs bg-zinc-100 border border-zinc-200 rounded-md px-2 py-1 text-zinc-700 outline-none focus:ring-1 focus:ring-zinc-900"
                onChange={(e) => {
                  const template = PROMPT_TEMPLATES.find(t => t.id === e.target.value);
                  if (template) setCustomPrompt(template.prompt);
                }}
                defaultValue="gravies"
              >
                <option value="" disabled>Load Template...</option>
                {PROMPT_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Professional food photography, 45-degree hero angle. Maintain exact plating. Enhance the Wok Hei signals: add subtle wisps of steam and emphasize charred edges. Replace background with a dark, rustic wooden table with soft bokeh. Add wooden chopsticks on the right..."
              className="w-full flex-1 min-h-[120px] p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none resize-none transition-all"
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Global Progress Bar */}
        {isProcessingAll && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100 z-50">
            <div 
              className="h-full bg-zinc-900 transition-all duration-300 ease-out"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        )}

        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-medium">Batch Processing</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Add Photos
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            {isProcessingAll ? (
              <button
                onClick={stopProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Stop Processing
              </button>
            ) : (
              <button
                onClick={processAll}
                disabled={images.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Process All
              </button>
            )}
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-8">
          {images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
                <ImageIcon className="w-10 h-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No photos uploaded</h3>
              <p className="text-zinc-500 mb-8">
                Upload your raw food photos. The AI will enhance them to a 1:1 ratio, apply your background, and add your logo.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <Upload className="w-5 h-5" />
                Select Photos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {images.map((img) => (
                <div key={img.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col relative">
                  {/* Individual Progress Bar */}
                  {img.status === 'processing' && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-100 z-10">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${img.progress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-700 truncate max-w-[200px]">
                        {img.file.name}
                      </span>
                      {img.status === 'success' && <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md"><CheckCircle className="w-3 h-3" /> Ready</span>}
                      {img.status === 'processing' && <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md"><Loader2 className="w-3 h-3 animate-spin" /> {img.progress}%</span>}
                      {img.status === 'error' && <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md"><XCircle className="w-3 h-3" /> Failed</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {img.status === 'idle' || img.status === 'error' ? (
                        <button
                          onClick={() => processSingleImage(img.id)}
                          disabled={isProcessingAll}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          Process
                        </button>
                      ) : null}
                      <button
                        onClick={() => removeImage(img.id)}
                        disabled={img.status === 'processing'}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-100">
                    {/* Original */}
                    <div className="p-4 flex flex-col">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Original</span>
                      <div className="flex-1 bg-zinc-100 rounded-xl overflow-hidden relative group flex items-center justify-center min-h-[200px]">
                        <img src={img.originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain" />
                      </div>
                    </div>
                    
                    {/* Processed */}
                    <div className="p-4 flex flex-col">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">AI Enhanced (1:1)</span>
                      <div className="flex-1 bg-zinc-50 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[200px] border border-zinc-100">
                        {img.status === 'success' && img.processedUrl ? (
                          <>
                            <img src={img.processedUrl} alt="Processed" className="absolute inset-0 w-full h-full object-contain" />
                            <a
                              href={img.processedUrl}
                              download={`enhanced-${img.file.name}`}
                              className="absolute bottom-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-zinc-900 rounded-lg shadow-sm hover:bg-white transition-colors z-10"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        ) : img.status === 'processing' ? (
                          <div className="flex flex-col items-center text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs font-medium">Enhancing image...</span>
                          </div>
                        ) : img.status === 'error' ? (
                          <div className="flex flex-col items-center text-red-400 text-center px-4">
                            <XCircle className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium">{img.error}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-zinc-300">
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-xs font-medium">Waiting to process</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
