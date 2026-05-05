import type { AIAnalysis } from '@shared/types'

export interface AIClient {
  name: string
  analyzeImage(input: { imageBase64: string; hash: string }): Promise<AIAnalysis>
  embedText(text: string): Promise<Float32Array>
  summarizeCluster(input: { imagesBase64: string[] }): Promise<string>
  compareImages(input: { imagesBase64: string[]; metadata: string }): Promise<string>
  rewritePrompts(input: { metadata: string }): Promise<string[]>
}
