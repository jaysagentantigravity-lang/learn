import { ai, MODELS } from "./client";
import { tokenEstimator } from "../tokenEstimator";

const discoveryCache = new Map<string, any>();

/**
 * Fetches dynamic discovery cards, greeting, and presets based on user location/context
 */
export const fetchDynamicDiscovery = async (location: string) => {
  // Optimization: Cache Key is now stable (Location + Hour) to prevent frequent refetching
  const cacheKey = `discovery-${location}-${new Date().getHours()}`; 
  
  // 1. Check Memory Cache
  if (discoveryCache.has(cacheKey)) {
    return discoveryCache.get(cacheKey);
  }

  // 2. Check Local Storage (Persistence across reloads)
  try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
          const parsed = JSON.parse(stored);
          discoveryCache.set(cacheKey, parsed);
          return parsed;
      }
  } catch (e) {
      // Ignore storage errors
  }

  const prompt = `
        You are a dynamic content curator for a futuristic learning AI interface.
        
        CONTEXT:
        User Location: ${location}
        Current Date: ${new Date().toDateString()}
        
        TASK 1: GENERATE GREETING
        Create a "Greeting" string. 
        - Must be hyper-encouraging, motivating, and creative.
        - Must be AWARE of the exact date and season.
        - Max 8 words. No exclamation marks.
        
        TASK 2: CURATE CONTENT TILES
        Generate 4 distinct, high-impact topics relevant to the current date/season using your INTERNAL KNOWLEDGE.
        Focus on:
        1. Local/Regional News or Vibe (simulated based on location)
        2. Global Tech/Science Breakthrough (general knowledge)
        3. A "Wow" Fact
        4. Data/Economic Trend (general knowledge)
        
        CRITICAL INSTRUCTIONS FOR TILES:
        - "title": Max 40 characters. REWRITE to fit 2 lines. 
        - "subtitle": Max 60 characters. REWRITE to fit 2 lines. Sentence case.
        - "imageUrl": Return an empty string "".
        - "imageKeyword": A single, broad, English noun representing the topic for a stock photo search (e.g., "Technology", "Space", "Nature", "Finance", "City", "Health"). Do NOT use complex phrases.
        
        TASK 3: GENERATE PRESETS (Chips)
        Create 4 distinct, short "Action" chips for the user to click.
        - Example: "Analyze Trends", "Explain Quantum", "Local News", "Surprise Me".
        - "icon": FontAwesome class name (e.g. "fa-bolt").

        RETURN JSON STRUCTURE:
        {
          "greeting": "The text string from Task 1",
          "tiles": [
             {
               "id": "1",
               "category": "news", 
               "title": "Short Headline",
               "subtitle": "Short sentence case description",
               "imageKeyword": "Technology",
               "imageUrl": "",
               "userPrompt": "The full question..."
             }
             ... (4 tiles total)
          ],
          "presets": [
             { "text": "Action Label", "icon": "fa-icon" }
             ... (4 presets)
          ]
        }
      `;

  // TRACK USAGE
  tokenEstimator.track('discovery', MODELS.FAST, prompt);

  try {
    const response = await ai.models.generateContent({
      model: MODELS.FAST,
      contents: prompt,
      config: {
        // Explicitly empty tools to prevent any 401 API key errors related to search
        tools: [],
        responseMimeType: 'application/json'
      }
    });

    const rawText = (response.text || "{}").replace(/```json|```/g, '').trim();
    const data = JSON.parse(rawText);
    
    if (data.tiles && data.presets) {
      discoveryCache.set(cacheKey, data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        // Clear old keys to prevent bloat (Simple cleanup: remove anything not current key)
        for (let i = 0; i < localStorage.length; i++) {
           const key = localStorage.key(i);
           if (key && key.startsWith('discovery-') && key !== cacheKey) {
               localStorage.removeItem(key);
           }
        }
      } catch (e) {}
      return data;
    }
    throw new Error("Invalid format");

  } catch (e: any) {
    // Specific handling for Quota Exceeded (429)
    if (e.message?.includes('429') || e.status === 429 || (e.error && e.error.code === 429)) {
        console.warn("Discovery API Quota Exceeded. Using offline fallback.");
    } else {
        console.error("Dynamic Discovery Failed", e);
    }
    
    // Fallback Data
    return {
      greeting: "Ignite your curiosity.",
      tiles: [
        { id: 'f1', category: 'tech', title: "Quantum Computing", subtitle: "The next great leap in processing power", imageKeyword: "Chip", userPrompt: "What is the latest in Quantum Computing?" },
        { id: 'f2', category: 'tech', title: "SpaceX Starship", subtitle: "Humanity's bridge to Mars colonization", imageKeyword: "Rocket", userPrompt: "Update me on the SpaceX Starship program." },
        { id: 'f3', category: 'fact', title: "CRISPR Tech", subtitle: "Editing the very code of life", imageKeyword: "DNA", userPrompt: "How does CRISPR technology work?" },
        { id: 'f4', category: 'data', title: "Global Economy", subtitle: "Current trends in the world market", imageKeyword: "Finance", userPrompt: "Summarize the current global economic outlook." }
      ],
      presets: [
        { text: "Tech News", icon: "fa-microchip" },
        { text: "Space Update", icon: "fa-shuttle-space" },
        { text: "History Fact", icon: "fa-landmark" },
        { text: "Write Code", icon: "fa-code" }
      ]
    };
  }
};