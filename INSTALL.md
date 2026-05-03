# 🚀 Installation & Deployment Guide

This guide covers all the ways you can install, run, and deploy the **FoodPhoto AI** application so you can use it anywhere, anytime.

## 🔑 Prerequisites Checklist
Before you begin with *any* self-hosted installation, you will need:
1. A **Gemini API Key** from Google AI Studio. ([Get it here](https://aistudio.google.com/))
2. (For Local/Docker) Git installed on your system.
3. (For Local) Node.js >= 20 installed.
4. (For Docker) Docker Desktop installed.

---

## Method 1: Install as a Desktop/Mobile App (PWA) 📱
The easiest way to use the application if it's already hosted on a URL. This method caches the web interface on your device so it looks and acts like a native app.

**On Desktop (Chrome / Edge):**
1. Navigate to the hosted application URL.
2. Look at the right side of the URL address bar. You will see an icon shaped like a screen with a downward arrow (or a "+" sign).
3. Click **"Install FoodPhoto AI"**.
4. The app will now have its own icon on your desktop/dock and run in its own window.

**On Mobile (iOS / Safari):**
1. Open the URL in Safari.
2. Tap the **Share** button at the bottom of the screen.
3. Scroll down and tap **"Add to Home Screen"**.

**On Mobile (Android / Chrome):**
1. Open the URL in Chrome.
2. Tap the three-dot menu icon in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.

---

## Method 2: Docker / Docker Compose 🐳
Docker provides a self-contained, isolated environment that guarantees the app will run consistently across different machines.

1. **Clone the repository** (or download the source code).
2. **Create your environment file**:
   In the root directory, create a file named `.env` and add your Gemini key:
   ```bash
   GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **Run Docker Compose**:
   Open a terminal in the folder and run:
   ```bash
   docker-compose up -d --build
   ```
4. **Access the Application**: Open your browser to `http://localhost:3000`.

*To stop the app, run `docker-compose down`.*

---

## Method 3: Local Node.js Development 💻
If you want to modify the code or run it natively on your machine without Docker.

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Set Environment Variable**:
   Create a `.env` file in the root folder:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   *The console will print a `localhost` URL (usually `http://localhost:3000` or `5173`).*

---

## Method 4: Production Cloud Deployment ☁️
You can easily deploy this repository to services like Vercel, Netlify, or Cloudflare Pages for free.

**Using Vercel/Netlify:**
1. Push your code to a GitHub repository.
2. Log into Vercel/Netlify and click **"Add New Project"**.
3. Import your GitHub repository.
4. Go to **Environment Variables** in the deployment settings and add:
   - Key: `GEMINI_API_KEY`
   - Value: `your_actual_api_key`
5. Click **Deploy**. The service will automatically detect Vite and build the React app!

---

## Troubleshooting
- **AI Processing Times Out**: This can happen if the image is too large or the Gemini API is experiencing high traffic. Try resizing the input image below 2MB before uploading.
- **ReferenceErrors or Build Failures**: Ensure you have run `npm install` fully, or if using Docker, that you added the `--build` flag to force a fresh image compilation.
