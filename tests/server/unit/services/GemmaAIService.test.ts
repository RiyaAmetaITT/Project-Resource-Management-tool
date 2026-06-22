import { GemmaAIService } from '../../../../server/src/services/ai/GemmaAIService';
import { CandidateSummary, TeamBuildCandidate } from '../../../../server/src/services/ai/IAIService';

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

describe('GemmaAIService', () => {
  const candidates: CandidateSummary[] = [
    {
      name: 'Jane Doe',
      skills: ['Java'],
      availablePercent: 50,
      recentActivityTags: ['Backend'],
    },
  ];

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty skill matches when candidate list is empty', async () => {
    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');
    await expect(service.generateSkillMatch('Java dev', [])).resolves.toEqual([]);
  });

  it('parses chat completion skill match response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '[{"name":"Jane Doe","reason":"Strong Java","suggestedUtilisationPercent":50}]',
          },
        }],
      }),
    });

    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');
    const results = await service.generateSkillMatch('Java developer', candidates);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Jane Doe');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses generate endpoint when host ends with /api/generate', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Risk summary table row' }),
    });

    const service = new GemmaAIService('http://localhost:11434/api/generate', 'test-key');
    const summary = await service.generateRiskSummary({
      projectName: 'Alpha',
      milestones: [],
      allocatedResources: [],
      recentHoursSummary: [],
    });

    expect(summary).toBe('Risk summary table row');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: 'test-key' }),
      }),
    );
  });

  it('returns empty team build assignments for invalid JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    });

    const bench: TeamBuildCandidate[] = [
      {
        employeeId: 1,
        name: 'Jane',
        department: 'Eng',
        designation: 'Dev',
        skills: [{ skillName: 'Java', proficiencyLevel: 'Advanced' }],
      },
    ];

    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');
    const assignments = await service.generateTeamBuild('Java Developer', bench);

    expect(assignments).toEqual([]);
  });

  it('falls back to top candidates when AI JSON has unknown names', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '[{"name":"Nobody","reason":"Nope"}]' } }],
      }),
    });

    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');
    const results = await service.generateSkillMatch('Java developer', candidates);

    expect(results[0].name).toBe('Jane Doe');
    expect(results[0].reason).toContain('Top match');
  });

  it('returns empty assignments for empty bench list', async () => {
    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');
    await expect(service.generateTeamBuild('Java Developer', [])).resolves.toEqual([]);
  });

  it('maps connection failures to actionable error messages', async () => {
    mockFetch.mockRejectedValue(new Error('fetch failed'));

    const service = new GemmaAIService('https://api.example.com/v1', 'test-key');

    await expect(service.generateSkillMatch('Java', candidates)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('Cannot reach LLM'),
    });
  });

  it('throws bad request when API returns error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'invalid api key',
    });

    const service = new GemmaAIService('https://api.example.com/v1', 'bad-key');

    await expect(service.generateSkillMatch('Java', candidates)).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('API key'),
    });
  });
});
