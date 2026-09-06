import { testSnapshot as applicationSnapshot } from '../test/fixtures/application';
import { getExperiencePath, getHomeAnchorPath, resolveAppRoute } from './routes';

describe('application routes', () => {
  it('builds root and subpath-safe experience links', () => {
    expect(getExperiencePath('project-b')).toBe('/experiences/project-b');
    expect(getExperiencePath('project-b', '/fe-application-timeline/')).toBe(
      '/fe-application-timeline/experiences/project-b',
    );
    expect(getHomeAnchorPath('project-b', '/fe-application-timeline/')).toBe(
      '/fe-application-timeline/#experience-project-b',
    );
  });

  it('resolves home and known experience paths', () => {
    expect(resolveAppRoute('/', applicationSnapshot.items)).toEqual({ type: 'home' });
    expect(resolveAppRoute('/index.html', applicationSnapshot.items)).toEqual({ type: 'home' });

    const route = resolveAppRoute('/experiences/project-b/', applicationSnapshot.items);
    expect(route.type).toBe('experience');
    if (route.type === 'experience') {
      expect(route.item.id).toBe('project-b');
    }
  });

  it('resolves deployment subpaths and rejects unknown paths', () => {
    expect(resolveAppRoute('/portfolio', applicationSnapshot.items, '/portfolio/')).toEqual({
      type: 'home',
    });
    expect(
      resolveAppRoute('/experiences/project-b', applicationSnapshot.items, '/portfolio/'),
    ).toEqual({ type: 'not-found' });
    const route = resolveAppRoute(
      '/fe-application-timeline/experiences/accessibility-study',
      applicationSnapshot.items,
      '/fe-application-timeline/',
    );

    expect(route.type).toBe('experience');
    expect(resolveAppRoute('/experiences/not-a-project', applicationSnapshot.items)).toEqual({
      type: 'not-found',
    });
    expect(resolveAppRoute('/something-else', applicationSnapshot.items)).toEqual({
      type: 'not-found',
    });
  });
});
