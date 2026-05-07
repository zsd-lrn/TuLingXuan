import type { AIAnalysis } from '@shared/types'

export interface AIClient {
  name: string
  analyzeImage(input: { imageBase64: string; hash: string }): Promise<AIAnalysis>
  embedText(text: string): Promise<Float32Array>
  summarizeCluster(input: { imagesBase64: string[] }): Promise<string>
  compareImages(input: { imagesBase64: string[]; metadata: string }): Promise<string>
  rewritePrompts(input: { metadata: string }): Promise<string[]>
  // For accounts where the embedding endpoint isn't provisioned, NL search falls
  // back to keyword matching. The text model splits the natural-language query
  // into 1–5 search keywords (Chinese tokenization isn't possible by whitespace).
  extractSearchKeywords(query: string): Promise<string[]>
}
