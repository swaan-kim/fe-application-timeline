import { validateApplicationConfig, type ApplicationConfig } from './application-config';

function createConfig(overrides: Partial<ApplicationConfig> = {}): ApplicationConfig {
  return {
    name: '김승완',
    role: 'Frontend 지원서',
    submissionDate: '2026-09-03',
    githubUrl: 'https://github.com/example-user',
    ...overrides,
  };
}

describe('application config validation', () => {
  it('validates chart-only dates, category, title and duplicate IDs', () => {
    const annotation = {
      id: 'work-context',
      title: '표 전용 활동',
      category: 'work' as const,
      startDate: '2026-03-01',
      endDate: '2026-06-30',
      chartOnly: true as const,
    };
    expect(() =>
      validateApplicationConfig(createConfig({ chartAnnotations: [annotation] })),
    ).not.toThrow();
    for (const override of [
      { startDate: '2026-02-30' },
      { startDate: '2026-07-01' },
      { startDate: '2025-01-01' },
      { title: '' },
      { category: 'other' as typeof annotation.category },
    ]) {
      expect(() =>
        validateApplicationConfig(
          createConfig({ chartAnnotations: [{ ...annotation, ...override }] }),
        ),
      ).toThrow();
    }
    expect(() =>
      validateApplicationConfig(createConfig({ chartAnnotations: [annotation, annotation] })),
    ).toThrow('중복');
  });
  it('validates a narrower chart window separately from the retained content range', () => {
    expect(() =>
      validateApplicationConfig(createConfig({ chartStartDate: '2026-03-01' })),
    ).not.toThrow();
    for (const chartStartDate of ['2025-01-01', '2026-09-03', '2026-10-01', '2026-02-30']) {
      expect(() => validateApplicationConfig(createConfig({ chartStartDate }))).toThrow(
        '표의 시작일',
      );
    }
  });
  it('accepts a GitHub profile URL', () => {
    expect(() =>
      validateApplicationConfig(createConfig(), { requirePublicationReady: true }),
    ).not.toThrow();
  });

  it('rejects non-profile and insecure GitHub URLs', () => {
    expect(() =>
      validateApplicationConfig(createConfig({ githubUrl: 'http://github.com/user' })),
    ).toThrow('GitHub 주소');
    expect(() =>
      validateApplicationConfig(createConfig({ githubUrl: 'https://github.com/user/repository' })),
    ).toThrow('GitHub 주소');
  });

  it('allows an empty GitHub URL in development and production', () => {
    const config = createConfig({ githubUrl: '' });
    expect(() => validateApplicationConfig(config)).not.toThrow();
    expect(() =>
      validateApplicationConfig(config, { requirePublicationReady: true }),
    ).not.toThrow();
  });
});
