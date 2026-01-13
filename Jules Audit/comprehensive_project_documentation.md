# Lumina AI - Comprehensive Project Documentation

**Target Audience:** Google Antigravity IDE & Development Team
**Date:** October 26, 2023
**Status:** Alpha Prototype

---

## 1. Executive Overview

**Lumina AI** is a next-generation, client-side React application that demonstrates the future of "Multimodal AI" interfaces. It uses Google's Gemini 2.0 Flash/Pro models to deliver a highly interactive, cinematic, and voice-enabled conversational experience.

Unlike traditional chatbots, Lumina focuses on **"Ambient Computing"** and **"Generative UI"**. It doesn't just output text; it dynamically renders widgets, generates charts, creates cinematic "storyboards" for complex topics, and speaks back to the user with procedurally generated audio atmospheres.

### Core Philosophy
*   **Show, Don't Tell:** If the user asks about data, show a chart. If they ask about history, generate a visual timeline.
*   **Voice First, Screen Second:** The interface is designed to be fully navigable via voice and audio, with "Story Mode" turning text responses into narrated documentaries.
*   **Client-Side Intelligence:** The application logic currently resides entirely in the browser (though a backend migration is planned per the Audit Report).

---

## 2. Real-Life Use Cases

### Use Case A: The "Visual Learner" (Education)
**Scenario:** A student is studying the Roman Empire.
1.  **Input:** User selects "Deep Dive" mode and types: "Explain the fall of Rome."
2.  **Lumina Response:**
    *   **Analyst Agent** activates.
    *   It generates a text summary but injects a `[DIAGRAM]` Mermaid.js timeline showing the dates of major events (410 AD, 476 AD).
    *   It prompts the image generator for a "Portrait of Romulus Augustulus".
    *   The UI renders a split-screen "Magazine Layout": Text on the right, high-res AI-generated portrait on the left.

### Use Case B: The "Audio Documentary" (Commute/Accessibility)
**Scenario:** A user is driving and wants to learn about Quantum Physics.
1.  **Input:** User taps the Microphone and asks: "Tell me a story about how Quantum Physics was discovered."
2.  **Lumina Response:**
    *   **Director Agent** activates (Story Mode).
    *   Instead of a block of text, it generates a `StoryManifest` JSON.
    *   **UI:** Renders a "Cinematic Player" with chapters (e.g., "Act I: The Ultraviolet Catastrophe").
    *   **Audio:** Lumina generates speech (TTS) for the narrative. It also plays a background "mood" track (e.g., "mysterious" ambient noise) defined in the manifest.
    *   **Visuals:** As the audio plays, the background image morphs to match the current chapter's scene description.

### Use Case C: Data Analyst (Professional)
**Scenario:** A business user needs to visualize sales data.
1.  **Input:** "Create a chart showing Q1 vs Q2 sales for TechCorp."
2.  **Lumina Response:**
    *   **Analyst Agent** detects a data request.
    *   It generates a `[[WIDGET:CHART]]` block containing the JSON data for the chart.
    *   **UI:** The `MessageList` component parses this tag and instantiates a `SmartWidget` component, rendering an interactive Bar Chart using Recharts or similar library.

---

## 3. UI Layout & User Flow

The interface is a single-page application (SPA) designed to look like a futuristic "Glassmorphism" OS.

### 3.1. The "Canvas" (Background)
*   **Component:** `BackgroundMesh.tsx`
*   **Behavior:** A dynamic, animated mesh gradient that changes color based on `AppState`.
    *   **Idle:** Deep Blue/Slate (Calm).
    *   **Thinking:** Pulsing Purple/Violet.
    *   **Speaking:** Black/Dark Grey (Focus).

### 3.2. Top Navigation
*   **Left:** "New Chat" (+) button.
*   **Right:** User Menu (Settings, About).
*   **Overlays:** `SettingsModal.tsx` for configuring Voice (Puck, Charon, Kore) and API keys (Legacy).

### 3.3. The Chat Stream (Center)
*   **Component:** `MessageList.tsx`
*   **Behavior:** A vertically scrolling list of `Message` cards.
*   **Visuals:**
    *   **User Message:** Right-aligned, glass card.
    *   **Model Message:** Left-aligned, full-width "Article" style.
    *   **Rich Media:**
        *   **Images:** Rendered via `VisualCard.tsx` (supports Portrait/Landscape).
        *   **Code:** Rendered via `CodeBlock.tsx` (syntax highlighting).
        *   **HTML/SVG:** Rendered via `CodeSandbox.tsx` (live preview).
        *   **Charts:** Rendered via `SmartWidget.tsx`.

### 3.4. The Input Deck (Bottom)
*   **Component:** `InputBar.tsx`
*   **Design:** A floating, metallic/glass pill bar at the bottom of the screen.
*   **Features:**
    *   **Text Input:** Auto-expanding textarea.
    *   **Mode Selector:** Dropdown to switch between "Insight" (Fast), "Deep Dive" (Research), "Storyteller" (Cinematic).
    *   **Attachments:** Button to upload images or mock-connect Google Drive.
    *   **Microphone:** Toggles `mediaRecorder` for voice input.
    *   **History Toggle:** Opens the `HistoryPanel.tsx` side drawer.

### 3.5. Audio Player (Overlay)
*   **Component:** `AudioPlayer.tsx`
*   **Position:** Appears only when audio is playing.
*   **Visuals:** A waveform visualizer (canvas) synced to the audio frequency data from `AudioContextManager`.

---

## 4. Functional Workflows (Technical)

### 4.1. The "Thinking" Loop
1.  **Trigger:** User sends a message via `InputBar`.
2.  **State Change:** `App.tsx` sets `AppState.THINKING`.
3.  **Service Call:** `generateResponseStream` (in `geminiService.ts`) is called.
4.  **Agent Selection:**
    *   If `mode === 'storytelling'`, call `runDirectorAgent`.
    *   Else, call `runAnalystAgent`.
5.  **Streaming:**
    *   The Gemini API returns chunks of text.
    *   **Stream Smoothing:** `App.tsx` uses a `requestAnimationFrame` loop (`streamLoopRef`) to "type out" the incoming text smoothly, rather than rendering raw chunks.
6.  **Rendering:** `MessageList` detects markdown tags (e.g., `![GENERATE_IMAGE]`) in real-time and renders placeholder skeletons until the tag is complete.

### 4.2. Audio Pipeline
1.  **Trigger:** User clicks "Read" or "Explain".
2.  **Generation:** `audioUtils.ts` sends text to Gemini TTS model.
3.  **Queueing:** Long text is split into chunks (`splitTextIntoChunks`).
4.  **Playback:** `App.tsx` manages an `audioQueue`. It "pre-fetches" the next chunk while the current one plays to ensure gapless playback.
5.  **Visualizer:** `AudioContextManager` connects the audio source to an `AnalyserNode`, which `AudioPlayer` reads 60 times a second to draw bars.

### 4.3. Persistence
1.  **Storage:** `storageService.ts` wraps IndexedDB.
2.  **Saving:** A debounced effect in `App.tsx` saves the current `messages` array to the `sessions` object store every time the chat updates.
3.  **Loading:** `HistoryPanel.tsx` fetches metadata (Title, Date) for the list. Clicking a session loads the full message history.

---

## 5. File Tree & Code Structure

```text
.
├── App.tsx                     # Main Application Controller (State, Audio Loop, Routing)
├── components/
│   ├── AudioPlayer.tsx         # Waveform visualizer & playback controls
│   ├── BackgroundMesh.tsx      # Animated SVG/CSS background
│   ├── BioluminescentOrb.tsx   # Decorative loading element
│   ├── BorderBeam.tsx          # CSS effect for InputBar
│   ├── CinematicStoryCard.tsx  # Special UI for "Story Mode" JSON manifests
│   ├── ClarificationCard.tsx   # UI for model asking user questions
│   ├── CodeBlock.tsx           # Syntax highlighter for code
│   ├── CodeSandbox.tsx         # IFrame sandboxing for HTML previews
│   ├── ErrorBoundary.tsx       # React Error Boundary
│   ├── HistoryPanel.tsx        # Side drawer for chat sessions
│   ├── HolographicStepper.tsx  # "Thinking..." progress indicator
│   ├── InputBar.tsx            # Main user input area (Text, Mic, Modes)
│   ├── MermaidDiagram.tsx      # Renders text-to-diagrams
│   ├── MessageList.tsx         # Main chat scroll view & Markdown renderer
│   ├── SettingsModal.tsx       # API Key & Voice settings
│   ├── SmartWidget.tsx         # Dynamic chart renderer
│   ├── StatsWidget.tsx         # Legacy stats renderer
│   ├── ThinkingIndicator.tsx   # Simple loading spinner
│   ├── VisualCard.tsx          # Wrapper for AI-generated images
│   └── WelcomeScreen.tsx       # "Empty State" with suggestion chips
├── services/
│   ├── audioContext.ts         # Singleton for Web Audio API
│   ├── audioUtils.ts           # Helpers: base64, blob, TTS calls
│   ├── geminiService.ts        # Main export for AI logic
│   ├── storageService.ts       # IndexedDB wrapper
│   ├── tokenEstimator.ts       # Utility to track token usage
│   └── genai/                  # Gemini SDK Wrappers
│       ├── chatService.ts      # Prompt Engineering & Agent Logic
│       ├── client.ts           # AI Client Initialization
│       ├── discoveryService.ts # Search/Grounding logic
│       └── mediaService.ts     # Image generation logic
├── types.ts                    # TypeScript Interfaces (Message, AppState, etc.)
├── vite.config.ts              # Build configuration
└── Jules Audit/                # Audit & Planning Artifacts
    ├── audit_report.md
    └── implementation_plan.md
```

---

## 6. Improvement & Enhancement Scope

Based on the technical audit, the following systematic improvements are planned:

### 6.1. Infrastructure (Priority: Critical)
*   **Backend Migration:** Move API calls from Client (`client.ts`) to a secure Proxy (Firebase Functions) to hide the API Key.
*   **Auth:** Implement User Accounts so history syncs across devices.

### 6.2. Intelligence (Priority: High)
*   **Memory:** Implement a "Long Term Memory" vector store so Lumina remembers facts about the user across sessions.
*   **Multi-Agent Router:** Replace the simple `if/else` agent logic in `chatService.ts` with a proper "Router Chain" that can dynamically call tools (Calculator, Calendar, Search) based on intent.

### 6.3. UX/Performance (Priority: Medium)
*   **Streaming Latency:** Implement WebSockets for audio streaming instead of HTTP polling to reduce TTS latency.
*   **Virtualization:** Refactor `MessageList` to use `react-virtuoso` to support infinite scrolling without lag.

### 6.4. Features (Priority: Low)
*   **Voice Interruption:** Allow the user to speak *over* the AI to interrupt it (requires Echo Cancellation & VAD).
*   **Multimodal Input:** Allow video input (Webcam) for real-time vision analysis.
