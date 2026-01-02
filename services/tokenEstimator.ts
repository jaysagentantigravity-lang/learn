import { FeatureType, TokenUsageRecord } from '../types';

// Heuristic configuration for predictive modeling
// Ratio: Output tokens per Input token
// Overhead: Base fixed cost (e.g. system prompt, JSON structure)
export const FEATURE_PROFILES: Record<FeatureType, { ratio: number, overhead: number }> = {
  discovery: { ratio: 0.5, overhead: 400 },    // JSON output is structured but concise
  clarification: { ratio: 0.1, overhead: 150 }, // Very short JSON check
  research: { ratio: 1.2, overhead: 300 },      // Research tends to expand on prompts
  visuals: { ratio: 0.2, overhead: 200 },       // Extraction task, output is smaller than input
  synthesis: { ratio: 0.8, overhead: 100 },     // Final response, often slightly shorter than full context
  tts: { ratio: 0, overhead: 0 },               // No text output
  stt: { ratio: 0, overhead: 50 },              // Audio input (0 text tokens), Output is text
  image_gen: { ratio: 0, overhead: 0 }          // No text output
};

class TokenEstimatorService {
  private history: TokenUsageRecord[] = [];
  private listeners: (() => void)[] = [];

  // Approximate token count (1 token ~= 4 chars)
  private countTokens(text: string): number {
    return Math.ceil((text || '').length / 4);
  }

  public track(feature: FeatureType, model: string, inputText: string) {
    const inputCount = this.countTokens(inputText);
    const profile = FEATURE_PROFILES[feature];
    
    // Estimate Output
    // Formula: (Input * Ratio) + Overhead
    let predictedOutput = Math.ceil((inputCount * profile.ratio) + profile.overhead);
    
    // Safety cap (e.g. max output window of model)
    predictedOutput = Math.min(predictedOutput, 8192);

    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      feature,
      model,
      inputTokens: inputCount,
      predictedOutputTokens: predictedOutput,
      totalTokens: inputCount + predictedOutput
    };

    this.history.push(record);
    this.notify();
    return record;
  }

  public getSummary() {
    const summary: Record<string, { calls: number, input: number, output: number, total: number }> = {};
    
    this.history.forEach(r => {
      if (!summary[r.feature]) {
        summary[r.feature] = { calls: 0, input: 0, output: 0, total: 0 };
      }
      summary[r.feature].calls++;
      summary[r.feature].input += r.inputTokens;
      summary[r.feature].output += r.predictedOutputTokens;
      summary[r.feature].total += r.totalTokens;
    });

    return summary;
  }
  
  public getTotalTokens() {
    return this.history.reduce((acc, curr) => acc + curr.totalTokens, 0);
  }

  // Simple subscription for UI updates
  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const tokenEstimator = new TokenEstimatorService();
