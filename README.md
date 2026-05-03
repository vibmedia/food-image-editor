# 🍽️ FoodPhoto AI - Listing Enhancer

FoodPhoto AI is an advanced, client-centric, React-based web application that uses Google's state-of-the-art **Gemini 2.5 Flash** vision models to automatically clean up, extract, and beautifully restage amateur restaurant food photos.

It was designed specifically to help restaurant owners create DoorDash / UberEats / Zomato ready marketing materials without hiring a professional food photographer.

## ✨ Features
- **AI Background Magic**: Automatically segments the food item from messy/unappealing backgrounds and places it in a professional, studio-lit environment (e.g., "Clean wooden table with soft lighting").
- **Batch Processing**: Drag and drop multiple photos and let the AI process them in a queue sequentially.
- **Auto-Branding**: Upload a restaurant logo (PNG) to automatically composite and watermark it perfectly onto the bottom right of the final images.
- **Aspect Ratio & Resize Control**: Ensure all downloads perfectly match delivery platform guidelines (e.g., 1200x800).
- **Progressive Web App (PWA)**: Installable as a native app on mobile devices and desktop computers.
- **Privacy First**: API requests are dispatched directly from the browser to Google's cloud. Images aren't stored on any middleware servers.

## 📚 Guides & Documentation
Check out the guides below to get the most out of the platform:

- [**Installation Guide (INSTALL.md)**](./INSTALL.md): Instructions on how to deploy via Docker, Node.js, Vercel, or install locally as a PWA.
- [**User Guide (USER_GUIDE.md)**](./USER_GUIDE.md): Step-by-step instructions on how to use the web application itself, tweak settings, and troubleshoot AI generations.

## 🛠️ Technology Stack
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **AI Engine**: @google/genai SDK (Gemini 2.5 Flash Image Generation & Content APIs)
- **State Management**: React Hooks (useState, useRef, useEffect)
- **Deployment**: Docker-ready, PWA-ready

## 📜 License
This project is provided as-is for educational and commercial exploration.
