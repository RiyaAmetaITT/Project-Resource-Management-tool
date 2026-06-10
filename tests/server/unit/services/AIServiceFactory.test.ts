import { AIServiceFactory } from '../../../../server/src/services/ai/AIServiceFactory';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { GeminiAIService } from '../../../../server/src/services/ai/GeminiAIService';
import { GroqAIService } from '../../../../server/src/services/ai/GroqAIService';
import { createMockRepo, makeSystemConfig } from '../../helpers/repositoryMocks';
import { LlmProvider } from '../../../../server/src/types/enums';

describe('AIServiceFactory', () => {
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let factory: AIServiceFactory;

  beforeEach(() => {
    configRepo = createMockRepo<SystemConfigRepository>();
    factory = new AIServiceFactory(configRepo);
  });

  it('returns GeminiAIService for gemini provider', async () => {
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmProvider: LlmProvider.GEMINI }));
    const service = await factory.create();
    expect(service).toBeInstanceOf(GeminiAIService);
  });

  it('returns GroqAIService for groq provider', async () => {
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmProvider: LlmProvider.GROQ }));
    const service = await factory.create();
    expect(service).toBeInstanceOf(GroqAIService);
  });

  it('throws for unsupported provider', async () => {
    configRepo.getConfig.mockResolvedValue(
      makeSystemConfig({ llmProvider: 'unknown' as LlmProvider }),
    );
    await expect(factory.create()).rejects.toThrow(/Unsupported LLM provider/);
  });
});
