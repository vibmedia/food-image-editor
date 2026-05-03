# 📖 User & Operational Guide

Welcome to **FoodPhoto AI**! This guide will teach you how to configure the tool and process your food listings efficiently.

## 1. Entering Your API Key
For the AI enhancements to function, the application requires a Gemini API Key.
1. When you first open the app, look at the top-right corner.
2. If you see a **"Configure AI"** button (or an input field for the key), click it.
3. Paste your Gemini API key (starts with `AIzaSy...`).
4. **Note:** The key is stored purely locally in your browser's session/storage. It is never sent to any database other than Google's secure API endpoint.

## 2. Global Configuration
Before uploading photos, tweak the settings on the **left sidebar** to match your restaurant's branding.

### Final Image Size
Standardizes outputs for food delivery apps (UberEats, DoorDash, Zomato, etc.):
- **Width x Height**: By default, it's set to `1200 x 800` (a standard 3:2 landscape). Ensure this matches your target platform's requirements.

### Initial Background Environment
This dictates the vibe of the generated image. Examples you can type:
- `Clean wooden table with soft sunlight`
- `Dark slate background with dramatic moody lighting`
- `Bright marble countertop in a modern cafe`

### Custom AI Instructions
Allows you to override or guide the AI's exact approach. The tool auto-populates a highly-optimized prompt, but you can append things like:
- *"Add a small green garnish to every dish."*
- *"Ensure the plates look metallic."*

### Restaurant Logo (Bottom Right)
You can automatically watermark all your processed photos:
1. Click the logo container area to upload your restaurant's logo.
2. Try to use a transparent PNG for the best results.
3. The logo will automatically be scaled to fit natively into the bottom-right corner of every processed photo.

## 3. Uploading & Processing
1. **Upload**: Drag and drop your raw photos into the dashed upload area in the center. You can upload multiple photos at once.
2. **Review**: The photos will stack in the "Batch Processing" list.
3. **Start Process**: Click **"Process All"** at the top right to queue up the AI enhancements.
4. **Wait**: The AI takes roughly 20-40 seconds per image to extract the food and reconstruct the beautiful background.

## 4. Downloading Images
Once images show a green `Success` banner:
- **Download Single**: Click the download button on a specific image.
- **Download All**: Use the **"Download All"** button at the top (next to "Stop Processing") to automatically save all processed images sequentially to your computer.

## FAQs / Best Practices
- **"The Food is cut off!"**: Make sure your original photo has the food mostly centered. High top-down angles or perfect 45-degree angles work best.
- **"It says 'Not a food item'!"**: The AI checks safety and relevance. If the background is too cluttered, physically crop the photo a bit before uploading so the food is the dominant subject.
- **"AI Timed Out"**: The default timeout is 3 minutes. Heavy network traffic or massive file sizes can cause this. Try processing fewer images at a time.
