import { IAIService } from './IAIService';
import { GeminiAIService } from './GeminiAIService';
import { GroqAIService } from './GroqAIService';
import { SystemConfigRepository } from '../../repositories/SystemConfigRepository';
import { LlmProvider } from '../../types/enums';

/**
 * AIServiceFactory — Factory Pattern.
 * Returns the correct IAIService implementation based on system_config.
 * No business code ever does `if gemini ... else groq`.
 */
export class AIServiceFactory {
  constructor(private readonly configRepository: SystemConfigRepository) {}

  async create(): Promise<IAIService> {
    const config = await this.configRepository.getConfig();
    switch (config.llmProvider) {
      case LlmProvider.GEMINI:
        return new GeminiAIService(config.llmApiKey);
      case LlmProvider.GROQ:
        return new GroqAIService(config.llmApiKey);
      default:
        throw new Error(`Unsupported LLM provider: ${config.llmProvider}`);
    }
  }
}
