import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, CheckCircle, XCircle, Loader2, Download, Trash2, Camera, Sparkles, Building2, Crop } from 'lucide-react';

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
    id: 'smart_auto',
    label: 'Smart Auto-Detect (Zomato Master Prompt)',
    prompt: "Authentic, high-quality restaurant food photography of [Food Name], 3:2 landscape composition, centered, [Angle]. PRESERVE THE SUBJECT: Maintain the exact portion, plating, and core pixels of the reference food to ensure platform authenticity. SENSORY ENHANCEMENT: Intensify the [Psychology] for appetite stimulation. Apply natural specular highlights to create a [Vibe] finish. LIGHTING: [Lighting]. BACKGROUND: Replace with a realistic [Background] with natural depth-of-field. MUST NOT look like an AI-generated stock photo. No scattered raw ingredients as props. Zomato/Swiggy compliant authentic aesthetic."
  },
  {
    id: 'gravies',
    label: 'Category C: Gravies and Soups',
    prompt: "Cinematic food photography of in a deep ceramic bowl, 3:2 landscape composition, clicked in a 45-degree angle. Focus on the umami visual cues: enhance the specular highlights on the glossy sauce to show its rich viscosity and velveted texture. Use a 45-degree side light to define the shape of the meat chunks and vegetables within the gravy. Background: Elegant dark marble surface with soft reflections. Remove any kitchen clutter or distracting props. Ensure the dish covers 75% of the frame as per Zomato guidelines. Vibrant colors, warm tones, inviting and savory."
  },
  {
    id: 'noodles',
    label: 'Category A: Stir-Fried Noodles and Rice',
    prompt: "Professional food photography of Stir-fried, 3:2 landscape composition, clicked in a 45-degree angle. Maintain the exact plating and portion size of the reference photo. Enhance the Wok Hei signals: add subtle wisps of semi-transparent steam and emphasize the charred, caramelized edges of the noodles. Apply side-lighting to highlight the individual graininess of the rice and the vibrant, crisp texture of the bell peppers. Background: Replace with a dark, rustic wooden table with a soft bokeh effect. Add a single pair of high-quality wooden chopsticks resting on the right side, leading the eye toward the center. 4K resolution, commercial food magazine style, appetizing and realistic."
  },
  {
    id: 'dimsum',
    label: 'Category B: Dim Sum and Bao',
    prompt: "Studio product shot of in a traditional bamboo steamer, 3:2 landscape composition, clicked in a 45-degree angle. Ensure the wrappers appear silken and semi-translucent, subtly revealing the filling within. Use soft backlighting to create a rim light effect on the pleats of the dough. Enhance the 'wispy' steam rising from the basket to signal peak temperature. Background: Minimalist neutral gray stone surface. Add a small, white ceramic dish of chili oil in the upper left corner to provide a color-pop. Zero distortions, realistic textures, Zomato-compliant authenticity."
  }
];

// --- Main App ---
export default function App() {
  return <MainDashboard />;
}

const getSmartVariables = (fileName: string) => {
  const lowerName = fileName.toLowerCase();
  const isStackable = /(burger|sandwich|cake|drink|beverage|shake|smoothie|coffee|tea|mocktail|cocktail|mojito|cola|juice|waffle|pancake)/.test(lowerName);
  const angle = isStackable ? "side shot with 45 degrees" : "clicked in a 45-degree angle";
  
  // Default (Fallback)
  let vars = {
    psychology: "appetizing, fresh, and delicious textures",
    vibe: "premium",
    lighting: "Use natural window light or realistic indoor restaurant lighting to define shape and depth",
    background: "clean restaurant table",
    angle
  };

  if (/(fried|crispy|crunch|pakora|samosa|spring roll|fries|chicken|tikka|kachori|papad|chips|burger|pizza|kurkure)/.test(lowerName)) {
    vars = { ...vars, psychology: "fracturable, crisp, golden-brown", vibe: "rustic", lighting: "Use natural side-lighting (harder light) to show edges and define shape and depth", background: "Rustic Wooden Restaurant Table or Dark Stone Surface" };
  } else if (/(curry|gravy|masala|paneer|dal|makhani|butter|sauce|korma|chole|rajma|chilli|manchurian)/.test(lowerName)) {
    vars = { ...vars, psychology: "glossy, high-viscosity, umami-rich", vibe: "elegant", lighting: "Use soft, diffused natural lighting to avoid harsh glare, defining shape and depth", background: "Simple Marble or Elegant Ceramic Dining Table" };
  } else if (/(soup|drink|juice|shake|smoothie|tea|coffee|lassi|water|cola|mocktail|cocktail|mojito|beverage)/.test(lowerName)) {
    vars = { ...vars, psychology: "translucent, glowing, fresh condensation", vibe: "refreshing", lighting: "Use natural backlighting for a subtle glow to define shape and depth", background: "Minimalist Cafe Table or Clean Slate" };
  } else if (/(bread|naan|roti|paratha|kulcha|bao|dim sum|momo|dumpling|bun|sandwich|wrap|roll)/.test(lowerName)) {
    vars = { ...vars, psychology: "steamy, soft-matte, velveted", vibe: "comforting", lighting: "Use soft diffused natural side-light to define shape and depth", background: "Bamboo Mat or Neutral Linen on a Dining Table" };
  } else if (/(cake|ice cream|dessert|sweet|pastry|brownie|chocolate|gulab jamun|rasgulla|barfi|halwa|cookie|waffle|pancake)/.test(lowerName)) {
    vars = { ...vars, psychology: "decadent, melting, creamy-smooth", vibe: "inviting", lighting: "Use warm, inviting natural 'Golden Hour' lighting to define shape and depth", background: "Pastel Surface or Fine China on a Cafe Table" };
  }

  return vars;
};

function MainDashboard() {
  const [customPrompt, setCustomPrompt] = useState(PROMPT_TEMPLATES[0].prompt);
  const [backgroundPrompt, setBackgroundPrompt] = useState('Clean wooden table');
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [targetWidth, setTargetWidth] = useState(1200);
  const [targetHeight, setTargetHeight] = useState(800);
  
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

  const formatFinalImage = async (base64Image: string, logoUrl: string | null, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Image);
          return;
        }

        // Calculate crop to cover target dimensions (no white space, no blurred bars)
        const imgRatio = img.width / img.height;
        const targetRatio = width / height;
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (imgRatio > targetRatio) {
          // Image is wider than target, crop sides
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Image is taller than target, crop top/bottom
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        // Draw the cropped image to completely fill the canvas
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

        const applyLogoAndResolve = () => {
          if (!logoUrl) {
            resolve(canvas.toDataURL('image/jpeg', 0.85)); // 0.85 to stay under 5MB
            return;
          }
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.onload = () => {
            const cardWidth = canvas.width * 0.18; 
            const logoRenderWidth = cardWidth * 0.8; 
            const logoRenderHeight = (logo.height / logo.width) * logoRenderWidth;
            const cardHeight = logoRenderHeight + (cardWidth * 0.25); // Add padding to card
            
            // Position top right, slightly inset so it looks like it's on the table behind the food
            const x = canvas.width * 0.80; 
            const y = canvas.height * 0.20;
            
            ctx.save();
            ctx.translate(x, y);
            
            // Give it a realistic physical card rotation/tilt (e.g. 6 degrees)
            ctx.rotate((-6 * Math.PI) / 180);
            
            // Apply drop shadow to simulate a physical card on the table
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = -4;
            ctx.shadowOffsetY = 8;
            
            // Draw the white card substrate
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 6);
            } else {
              ctx.rect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
            }
            ctx.fill();
            
            // Reset shadow so the logo graphic itself doesn't cast an internal shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Draw the logo centered within the card
            ctx.drawImage(logo, -logoRenderWidth / 2, -logoRenderHeight / 2, logoRenderWidth, logoRenderHeight);
            
            ctx.restore();
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          logo.onerror = () => resolve(canvas.toDataURL('image/jpeg', 0.85));
          logo.src = logoUrl;
        };

        applyLogoAndResolve();
      };
      img.onerror = () => reject(new Error("Failed to load generated image for formatting"));
      img.src = base64Image;
    });
  };

  const prepareImageForAI = (file: File, finalWidth: number, finalHeight: number): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Determine closest supported aspect ratio for the AI
          const targetRatio = finalWidth / finalHeight;
          let aiRatio = 1; // 1:1
          if (targetRatio > 1.1) {
            aiRatio = targetRatio > 1.5 ? 16/9 : 4/3;
          } else if (targetRatio < 0.9) {
            aiRatio = targetRatio < 0.66 ? 9/16 : 3/4;
          }

          // Calculate padded (fit within target ratio)
          const maxDim = 512;
          let targetWidth = maxDim;
          let targetHeight = maxDim;
          
          if (aiRatio > 1) {
            targetHeight = Math.round(maxDim / aiRatio);
          } else {
            targetWidth = Math.round(maxDim * aiRatio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          
          // Calculate crop to cover target dimensions (no white padding)
          const imgRatio = img.width / img.height;
          
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;

          if (imgRatio > aiRatio) {
            // Image is wider than target, crop sides
            sourceWidth = img.height * aiRatio;
            sourceX = (img.width - sourceWidth) / 2;
          } else {
            // Image is taller than target, crop top/bottom
            sourceHeight = img.width / aiRatio;
            sourceY = (img.height - sourceHeight) / 2;
          }

          // Draw the cropped image to completely fill the canvas
          ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
          
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

      // Convert to base64, pad to target ratio, and resize
      const { base64: base64Data, mimeType } = await prepareImageForAI(imageToProcess.file, targetWidth, targetHeight);
      
      const fileName = imageToProcess.file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      
      // Detect generic file names (e.g., "image", "IMG_1234", "WhatsApp Image")
      const isGenericName = /^(image|photo|img|picture|untitled|whatsapp|screenshot|capture|default|file|dsc)/i.test(fileName) || !/[a-zA-Z]/.test(fileName);
      const smartFoodName = isGenericName ? "the dish" : fileName;

      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 30 } : img)));

      // Build Guidelines Prompt
      const systemGuidelines = `
        Goal: Authentic, high-quality restaurant food photography for food delivery apps.
        Focus: Dish must be the hero, centered, covering ~70-75% of the frame. Leave breathing room around the dish.
        Background: ${backgroundPrompt || 'Realistic restaurant table surface'}.
        Lighting: Natural window light or realistic indoor restaurant lighting. Avoid overly artificial studio lighting.
        Strictly Prohibited: DO NOT make it look like a stock photo. DO NOT add raw ingredients, scattered props, or artificial garnishes around the plate. No watermarks, text overlays, prices, people/hands, collages, logos of any kind (e.g., Zomato, Swiggy, matchboxes, branding). Do NOT add any text, logos, or brand names to the image.
      `;

      // Parse Smart Variables if using the Master Prompt
      const smartVars = getSmartVariables(smartFoodName);
      const parsedCustomPrompt = customPrompt
        .replace(/\[Food Name\]/gi, smartFoodName)
        .replace(/\[Psychology\]/gi, smartVars.psychology)
        .replace(/\[Vibe\]/gi, smartVars.vibe)
        .replace(/\[Lighting\]/gi, smartVars.lighting)
        .replace(/\[Background\]/gi, smartVars.background)
        .replace(/\[Angle\]/gi, smartVars.angle)
        .replace(/3:2 landscape composition/gi, "optimal composition");

      const fullPrompt = `
        You are an expert food photographer and photo editor.
        
        CRITICAL INSTRUCTION: The food in this image is "${smartFoodName}". 
        You MUST preserve the exact food, ingredients, shape, and plating of the original image. DO NOT hallucinate or change the food itself. Your ONLY job is to enhance the lighting, textures, and replace the background.
        
        Enhance and edit the provided food image according to the following strict guidelines:
        ${systemGuidelines}

        User's specific instructions:
        ${parsedCustomPrompt || "Enhance the lighting, make the food look appetizing."}
      `;

      let response;
      let lastError;
      
      // Robust Retry Logic: up to 3 attempts
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 30 + (attempt * 10) } : img)));
          
          // Determine closest supported aspect ratio for the AI
          const targetRatio = targetWidth / targetHeight;
          let aiAspectRatio = "1:1";
          if (targetRatio > 1.1) {
            aiAspectRatio = targetRatio > 1.5 ? "16:9" : "4:3";
          } else if (targetRatio < 0.9) {
            aiAspectRatio = targetRatio < 0.66 ? "9:16" : "3:4";
          }

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
            },
            config: {
              imageConfig: {
                aspectRatio: aiAspectRatio,
              }
            }
          });

          let timeoutId: any;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("AI processing timed out. Please try a smaller image or wait.")), 180000);
          });

          try {
            response = await Promise.race([responsePromise, timeoutPromise]) as any;
          } finally {
            clearTimeout(timeoutId);
          }
          
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

      setImages((prev) => prev.map((img) => (img.id === id ? { ...img, progress: 90 } : img)));
      
      // Always format the final image to target dimensions and apply logo if available
      processedUrl = await formatFinalImage(processedUrl, restaurantLogo || null, targetWidth, targetHeight);

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

  const downloadAll = async () => {
    const successfulImages = imagesRef.current.filter(img => img.status === 'success' && img.processedUrl);
    for (let i = 0; i < successfulImages.length; i++) {
      const img = successfulImages[i];
      const a = document.createElement('a');
      a.href = img.processedUrl!;
      a.download = `processed_${img.file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  };

  const resizeSingleImage = async (id: string) => {
    const imageToProcess = imagesRef.current.find((img) => img.id === id);
    if (!imageToProcess || imageToProcess.status === 'processing') return;

    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: 'processing', error: null, progress: 50 } : img))
    );

    try {
      const processedUrl = await formatFinalImage(imageToProcess.originalUrl, restaurantLogo || null, targetWidth, targetHeight);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'success', processedUrl, progress: 100 } : img
        )
      );
    } catch (error: any) {
      console.error(error);
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, status: 'error', error: error.message || "Failed to resize image", progress: 0 } : img
        )
      );
    }
  };

  const resizeAll = async () => {
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

      await resizeSingleImage(nextImage.id);
      
      const updatedImages = imagesRef.current;
      const completed = updatedImages.filter(img => img.status === 'success' || img.status === 'error').length;
      setGlobalProgress((completed / updatedImages.length) * 100);
    }

    setIsProcessingAll(false);
    isProcessingAllRef.current = false;
    setTimeout(() => setGlobalProgress(0), 2000);
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
              <p className="text-xs text-zinc-500 font-medium">Listing Enhancer</p>
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
          {/* Resize Options */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Final Image Size</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-400 uppercase mb-1">Width (px)</label>
                <input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => setTargetWidth(Number(e.target.value) || 1200)}
                  className="w-full p-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-400 uppercase mb-1">Height (px)</label>
                <input
                  type="number"
                  value={targetHeight}
                  onChange={(e) => setTargetHeight(Number(e.target.value) || 800)}
                  className="w-full p-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </div>

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
                defaultValue="smart_auto"
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
              <>
                <button
                  onClick={downloadAll}
                  disabled={!images.some(img => img.status === 'success')}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
                <button
                  onClick={resizeAll}
                  disabled={images.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Crop className="w-4 h-4" />
                  Resize All
                </button>
                <button
                  onClick={processAll}
                  disabled={images.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  Process All
                </button>
              </>
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
                Upload your raw food photos. The AI will enhance them, apply your background, resize to your target dimensions, and add your logo.
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
                        <>
                          <button
                            onClick={() => resizeSingleImage(img.id)}
                            disabled={isProcessingAll}
                            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-50 border border-zinc-200"
                          >
                            Resize Only
                          </button>
                          <button
                            onClick={() => processSingleImage(img.id)}
                            disabled={isProcessingAll}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            Process
                          </button>
                        </>
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
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">AI Processed</span>
                      <div className="flex-1 bg-zinc-50 rounded-xl overflow-hidden relative flex items-center justify-center min-h-[200px] border border-zinc-100">
                        {img.status === 'success' && img.processedUrl ? (
                          <>
                            <img src={img.processedUrl} alt="Processed" className="absolute inset-0 w-full h-full object-contain" />
                            <a
                              href={img.processedUrl}
                              download={img.file.name}
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
