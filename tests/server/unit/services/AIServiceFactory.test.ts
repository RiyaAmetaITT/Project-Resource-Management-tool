import { AIServiceFactory } from '../../../../server/src/services/ai/AIServiceFactory';
import { SystemConfigRepository } from '../../../../server/src/repositories/SystemConfigRepository';
import { GemmaAIService } from '../../../../server/src/services/ai/GemmaAIService';
import { createMockRepo, makeSystemConfig } from '../../helpers/repositoryMocks';
import { LlmProvider } from '../../../../server/src/types/enums';

describe('AIServiceFactory', () => {
  let configRepo: jest.Mocked<SystemConfigRepository>;
  let factory: AIServiceFactory;

  beforeEach(() => {
    configRepo = createMockRepo<SystemConfigRepository>();
    factory = new AIServiceFactory(configRepo);
  });

  it('returns GemmaAIService for gemma provider', async () => {
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmProvider: LlmProvider.GEMMA }));
    const service = await factory.create();
    expect(service).toBeInstanceOf(GemmaAIService);
  });

  it('returns GemmaAIService for legacy gemini provider', async () => {
    configRepo.getConfig.mockResolvedValue(
      makeSystemConfig({ llmProvider: 'gemini' as LlmProvider }),
    );
    const service = await factory.create();
    expect(service).toBeInstanceOf(GemmaAIService);
  });

  it('throws for unsupported provider', async () => {
    configRepo.getConfig.mockResolvedValue(
      makeSystemConfig({ llmProvider: 'unknown' as LlmProvider }),
    );
    await expect(factory.create()).rejects.toThrow(/Unsupported LLM provider/);
  });

  it('throws when LLM host is missing', async () => {
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmHost: '  ' }));
    await expect(factory.create()).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('LLM host'),
    });
  });

  it('throws when LLM API key is missing', async () => {
    configRepo.getConfig.mockResolvedValue(makeSystemConfig({ llmApiKey: '' }));
    await expect(factory.create()).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('API key'),
    });
  });
});
