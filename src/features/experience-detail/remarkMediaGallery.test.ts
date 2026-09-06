import { fromMarkdown } from 'mdast-util-from-markdown';
import { remarkMediaGallery } from './remarkMediaGallery';

const picture = (name: string, gallery = true) =>
  `![${name}](/media/experiences/sample/${name}.png${gallery ? ' "gallery"' : ''})`;

describe('remarkMediaGallery', () => {
  it('groups only adjacent opted-in images and preserves their order', () => {
    const tree = fromMarkdown(
      [picture('one'), picture('two'), '설명', picture('three')].join('\n\n'),
    );
    remarkMediaGallery()(tree);
    expect(tree.children).toHaveLength(3);
    const group = tree.children[0]!;
    expect(group.type).toBe('blockquote');
    expect(group.data).toEqual({ hName: 'div' });
    expect(JSON.stringify(group)).toContain('one.png');
    expect(JSON.stringify(group)).toContain('two.png');
    expect(tree.children[2]?.type).toBe('paragraph');
  });

  it('leaves ordinary images and text unchanged', () => {
    const tree = fromMarkdown([picture('one', false), picture('two', false), '설명'].join('\n\n'));
    const before = structuredClone(tree);
    remarkMediaGallery()(tree);
    expect(tree).toEqual(before);
  });
});
