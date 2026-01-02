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
  onUpdate({ status: "Director Planning Shots..." });

  const directorPrompt = `
    ROLE: You are an Award-Winning Documentary Director and Data Cinematographer.
    
    TASK: Create a cinematic "Story Manifest" JSON for the request: "${prompt}".
    
    RESEARCH CONTEXT: ${contextData}
    CHAT HISTORY: ${conversationContext}
    
    DIRECTOR'S RULES:
    1. **Narrative Style**: Do NOT write an article. Write a SCRIPT for a narrator. Use "Show, Don't Tell". Emotional, pacing from setup to climax.
    2. **Visuals**: Define highly specific, photorealistic 8k image prompts.
    3. **Data Cinematography**: If the story involves numbers/locations, you MUST insert a "widget".
    4. **Audio Direction**: Assign a specific 'mood' ('heroic', 'tragic', 'mysterious', 'energetic', 'peaceful') to drive the procedural soundtrack.

    CRITICAL: RETURN RAW JSON ONLY. DO NOT USE MARKDOWN BLOCKS (\`\`\`json).
    
    JSON STRUCTURE:
    {
      "title": "Cinematic Title",
      "subjectName": "Main Subject",
      "chapters": [
        {
          "id": "c1",
          "title": "Act I",
          "narrative": "Spoken word text...",
          "visualPrompt": "Visual description...",
          "mood": "mysterious"
        },
        {
          "id": "c2",
          "title": "Act II",
          "narrative": "Next part...",
          "visualPrompt": "Visual description...",
          "mood": "energetic",
          "widget": {
             "type": "CHART",
             "data": { "type": "bar", "data": [{ "label": "X", "value": 10 }] }
          }
        }
      ]
    }
    [[STORY_MANIFEST_END]]
  `;

  try {
    // TRACK
    tokenEstimator.track('synthesis', MODELS.WRITER, directorPrompt);

    const result = await ai.models.generateContentStream({
      model: MODELS.WRITER,
      contents: directorPrompt
    });

    let accumulatedText = "";
    let manifestFound = false;

    for await (const chunk of result) {
       if (signal?.aborted) return;
       const textChunk = chunk.text;
       if (textChunk) {
         accumulatedText += textChunk;
       }
    }
    
    // PARSING LOGIC: Robustly extract JSON, ignoring potential markdown wrappers
    try {
        // 1. Clean up markdown
        let cleanJson = accumulatedText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .replace(/\[\[STORY_MANIFEST_END\]\]/g, '')
            .trim();

        // 2. Find outermost braces if extra text exists
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) {
            cleanJson = match[0];
            const manifest = JSON.parse(cleanJson);
            
            // Validate essential fields before sending
            if (manifest.chapters && manifest.chapters.length > 0) {
                onUpdate({ storyManifest: manifest });
                onUpdate({ status: "Production Ready" });
                manifestFound = true;
            }
        }
    } catch (e) {
        console.error("Director JSON Parse Error", e);
    }

    if (!manifestFound) {
        onUpdate({ 
           text: "I apologize, but I couldn't generate a valid screenplay for this story. Please try a different topic.",
           status: "Director Error"
        });
    } else {
        onUpdate({ status: "completed" });
    }

  } catch (error) {
    console.error("Director Agent Failed", error);
    throw error;
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