import type { Paragraph, Root, RootContent } from 'mdast';

function isGalleryImage(node: RootContent): node is Paragraph {
  return (
    node.type === 'paragraph' &&
    node.children.length === 1 &&
    node.children[0]?.type === 'image' &&
    node.children[0].title === 'gallery'
  );
}

/** Opt-in: adjacent standalone images titled "gallery" share a responsive row. */
export function remarkMediaGallery() {
  return (tree: Root) => {
    const children: RootContent[] = [];
    for (let index = 0; index < tree.children.length;) {
      const node = tree.children[index]!;
      if (!isGalleryImage(node)) {
        children.push(node);
        index += 1;
        continue;
      }
      const group: Paragraph[] = [];
      while (index < tree.children.length && isGalleryImage(tree.children[index]!)) {
        const paragraph = tree.children[index++] as Paragraph;
        const picture = paragraph.children[0];
        if (picture?.type === 'image') picture.title = null;
        group.push(paragraph);
      }
      if (group.length === 1) children.push(group[0]!);
      else children.push({ type: 'blockquote', children: group, data: { hName: 'div' } });
    }
    tree.children = children;
  };
}
