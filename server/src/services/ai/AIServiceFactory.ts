import { IAIService } from './IAIService';
import { GemmaAIService } from './GemmaAIService';
import { SystemConfigRepository } from '../../repositories/SystemConfigRepository';
import { AppError } from '../../errors/AppError';

const GEMMA_COMPATIBLE_PROVIDERS = new Set(['gemma', 'gemini', 'groq']);

export class AIServiceFactory {
  constructor(private readonly configRepository: SystemConfigRepository) {}

  async create(): Promise<IAIService> {
    const config = await this.configRepository.getConfig();
    const provider = String(config.llmProvider).toLowerCase();

    if (!GEMMA_COMPATIBLE_PROVIDERS.has(provider)) {
      throw AppError.badRequest(`Unsupported LLM provider: ${config.llmProvider}`);
    }

    const host = config.llmHost?.trim();
    const apiKey = config.llmApiKey?.trim();
    if (!host) {
      throw AppError.badRequest(
        'LLM host is not configured. Set it in Admin → System Configuration.',
      );
    }
    if (!apiKey) {
      throw AppError.badRequest(
        'LLM API key is not configured. Set it in Admin → System Configuration.',
      );
    }

    return new GemmaAIService(host, apiKey, config.llmModel);
  }
}
