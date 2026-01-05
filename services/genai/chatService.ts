
import { ai, MODELS } from "./client";
import { ProcessingOptions, Clarification, Message } from "../../types";
import { tokenEstimator } from "../tokenEstimator";

export type StreamUpdate = {
  text?: string;
  sources?: any[];
  clarification?: Clarification;
  suggestedActions?: string[];
  status?: string; // "Researching...", "Designing...", "Writing..."
  storyManifest?: any; // New field for JSON manifest
};

// Helper: Format history for context (Limit to last 4 turns to save tokens)
const formatHistory = (history: Message[]): string => {
  if (!history || history.length === 0) return "";
  
  return history
    .slice(-4) 
    .map(m => {
      const content = m.image ? `[User uploaded an image] ${m.text}` : m.text;
      return `${m.role.toUpperCase()}: ${content}`;
    })
    .join('\n');
};

/**
 * AGENT 1: The Director (Storyteller Mode)
 * Dedicated pipeline for cinematic, narrative, and visual orchestration.
 */
const runDirectorAgent = async (
  prompt: string, 
  history: Message[], 
  onUpdate: (update: StreamUpdate) => void,
  signal?: AbortSignal
) => {
  const conversationContext = formatHistory(history);
  
  // STEP 1: Research Phase (Brief check for facts if needed)
  onUpdate({ status: "Director Researching..." });
  
  let contextData = "";
  try {
      const tools = [{ googleSearch: {} }];
      const researchPrompt = `
        TASK: Briefly gather key visual and narrative facts for a documentary about: "${prompt}".
        CONTEXT: ${conversationContext}
        If the topic is abstract/creative, return "NO_SEARCH_NEEDED".
      `;
      
      const researchRes = await ai.models.generateContent({
          model: MODELS.RESEARCH,
          contents: researchPrompt,
          config: { tools }
      });
      contextData = researchRes.text || "";
  } catch(e) { console.warn("Director research skipped", e); }

  // STEP 2: Scripting & Direction
  onUpdate({ status: "Writing Screenplay..." });

  const directorPrompt = `
    ROLE: You are an Award-Winning Documentary Director.
    TASK: Write a JSON Screenplay for: "${prompt}".
    
    RESEARCH: ${contextData}
    CONTEXT: ${conversationContext}
    
    INSTRUCTIONS:
    1. Structure the story into 3 to 5 distinct "Chapters".
    2. "narrative": The spoken script (approx 2-3 sentences per chapter). Engaging, "Show Don't Tell".
    3. "visualPrompt": A specific, photorealistic AI image prompt description (e.g., "Wide shot of Mars surface, red dust, cinematic lighting").
    4. "mood": Choose ONE: 'heroic', 'tragic', 'mysterious', 'energetic', 'peaceful'.
    
    IMPORTANT: Return ONLY valid JSON. No Markdown formatting. No \`\`\` code blocks.
    
    JSON SCHEMA:
    {
      "title": "Cinematic Title",
      "subjectName": "Short Subject Name (e.g. Apollo 11)",
      "chapters": [
        {
          "id": "1",
          "title": "Act I: The Setup",
          "narrative": "The text to be spoken...",
          "visualPrompt": "The image description...",
          "mood": "mysterious"
        }
      ]
    }
  `;

  try {
    // TRACK
    tokenEstimator.track('synthesis', MODELS.WRITER, directorPrompt);

    const result = await ai.models.generateContent({
      model: MODELS.WRITER,
      contents: directorPrompt,
      config: {
        responseMimeType: 'application/json' // Force JSON mode for stability
      }
    });

    const text = result.text || "";
    
    // Robust Parsing
    try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const manifest = JSON.parse(cleanJson);
        
        if (manifest.chapters && Array.isArray(manifest.chapters)) {
            // Add IDs if missing
            manifest.chapters = manifest.chapters.map((c: any, i: number) => ({
                ...c,
                id: `ch_${Date.now()}_${i}`
            }));
            
            onUpdate({ storyManifest: manifest });
            onUpdate({ status: "completed" });
        } else {
            throw new Error("Invalid schema");
        }
    } catch (e) {
        console.error("JSON Parse Error", e);
        onUpdate({ 
           text: "I was unable to generate a valid screenplay. Please try asking in a different way.",
           status: "Director Error"
        });
    }

  } catch (error) {
    console.error("Director Agent Failed", error);
    onUpdate({ status: "error" });
  }
};

/**
 * AGENT 2: Standard Analyst (Learning/Explanatory Mode)
 */
const runAnalystAgent = async (
    prompt: string,
    history: Message[],
    options: ProcessingOptions,
    onUpdate: (update: StreamUpdate) => void,
    signal?: AbortSignal
) => {
  const conversationContext = formatHistory(history);
  
  // 1. Research Phase
  onUpdate({ status: "Accessing Knowledge Grid..." });
  let researchData = "";
  let sources: any[] = [];
  
  if (options.useSearch) {
      try {
        const tools = [{ googleSearch: {} }];
        const researchPrompt = `
          CONVERSATION: ${conversationContext}
          TASK: Answer: "${prompt}". 
          If this requires real-time data or biographical facts, search and return unstructured notes. 
          If creative/general, return "SKIP_RESEARCH".`;

        tokenEstimator.track('research', MODELS.RESEARCH, researchPrompt);
        const researchResponse = await ai.models.generateContent({
          model: MODELS.RESEARCH,
          contents: researchPrompt,
          config: { tools: tools }
        });
        
        if (signal?.aborted) return;
        const rawRes = researchResponse.text || "";
        
        if (!rawRes.includes("SKIP_RESEARCH")) {
            researchData = rawRes;
            if (researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
              sources = researchResponse.candidates[0].groundingMetadata.groundingChunks
                .map((chunk: any) => chunk.web ? { title: chunk.web.title, url: chunk.web.uri } : null)
                .filter(Boolean);
            }
            onUpdate({ sources });
        }
      } catch (e) { console.warn("Research failed", e); }
  }

  // 2. Synthesis Phase
  onUpdate({ status: "Synthesizing..." });
  
  const analystPrompt = `
    HISTORY: ${conversationContext}
    DATA: ${researchData}
    REQUEST: "${prompt}"
    
    ROLE: Lumina Analyst.
    OUTPUT: Markdown. 
    VISUALS: Use ![GENERATE_IMAGE:LANDSCAPE: prompt] for key concepts.
    WIDGETS: Use [[WIDGET:TYPE]] json [[/WIDGET]] for data.
    SUGGESTIONS: End with [[SUGGESTIONS]] list [[/SUGGESTIONS]].
  `;

  tokenEstimator.track('synthesis', MODELS.WRITER, analystPrompt);

  const result = await ai.models.generateContentStream({
      model: MODELS.WRITER,
      contents: analystPrompt
  });

  let fullText = "";
  for await (const chunk of result) {
      if (signal?.aborted) return;
      if (chunk.text) {
          fullText += chunk.text;
          onUpdate({ text: fullText });
      }
  }

  // Extract suggestions
  const suggestionRegex = /\[\[SUGGESTIONS\]\]([\s\S]*?)\[\[\/SUGGESTIONS\]\]/;
  const match = fullText.match(suggestionRegex);
  let finalActions: string[] = [];
  
  if (match) {
      fullText = fullText.replace(match[0], '').trim();
      finalActions = match[1].split('\n').map(s => s.trim().replace(/^[-*\d\.]+\s*/, '')).filter(s => s.length > 0).slice(0, 3);
      onUpdate({ text: fullText, suggestedActions: finalActions, status: "completed" });
  } else {
      onUpdate({ status: "completed" });
  }
};


/**
 * Main Orchestrator
 */
export const generateResponseStream = async (
  prompt: string,
  history: Message[],
  options: ProcessingOptions,
  onUpdate: (update: StreamUpdate) => void,
  signal?: AbortSignal 
): Promise<void> => {
  
  if (signal?.aborted) return;
  
  let fullPrompt = prompt;
  if (options.clarificationContext) {
    fullPrompt = `Context: "${options.clarificationContext}". Request: ${prompt}`;
  }

  // Route based on Mode
  if (options.mode === 'storytelling') {
      await runDirectorAgent(fullPrompt, history, onUpdate, signal);
  } else {
      await runAnalystAgent(fullPrompt, history, options, onUpdate, signal);
  }
};
