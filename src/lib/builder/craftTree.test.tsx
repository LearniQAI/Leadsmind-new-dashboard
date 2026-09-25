// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { Editor, useEditor } from '@craftjs/core';
import { withParentLinks } from './craftTree';
import { LESSON_TEMPLATES } from './lessonTemplates';

// Runs the REAL Craft.js 0.2.12 deserialize/delete/move actions (not a re-implementation) on
// the real lesson template JSON. Stub components stand in for the resolver entries — only the
// resolvedName matters to the actions under test.
const stub = (name: string) => {
  const C = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  C.craft = { displayName: name };
  return C;
};
const resolver = Object.fromEntries(
  ['Container', 'Section', 'Heading', 'Paragraph', 'Image', 'Columns', 'LessonBlockNode', 'ContentBox'].map((n) => [n, stub(n)])
);

function mountEditor() {
  let api!: ReturnType<typeof useEditor>;
  const Grab = () => { api = useEditor(); return null; };
  render(<Editor resolver={resolver}><Grab /></Editor>);
  return () => api;
}

describe.each(LESSON_TEMPLATES.map((t) => [t.id, t.content] as const))('lesson template %s', (_id, content) => {
  const nonRoot = Object.keys(JSON.parse(content)).filter((k) => k !== 'ROOT');

  it('reproduces the bug: raw template JSON makes every delete throw', () => {
    const editor = mountEditor();
    act(() => editor().actions.deserialize(content));
    for (const id of nonRoot) {
      expect(() => editor().actions.delete(id)).toThrow();
    }
  });

  it('after withParentLinks, every node can be deleted and is actually removed', () => {
    for (const id of nonRoot) {
      const editor = mountEditor();
      act(() => editor().actions.deserialize(withParentLinks(content)));
      const parentId = editor().query.node(id).get().data.parent!;
      expect(parentId).toBeTruthy();

      act(() => editor().actions.delete(id));

      const nodes = editor().query.getNodes();
      expect(nodes[id]).toBeUndefined();
      expect(nodes[parentId].data.nodes).not.toContain(id);
    }
  });

  it('after withParentLinks, moving a section works and survives a serialize round-trip', () => {
    const editor = mountEditor();
    act(() => editor().actions.deserialize(withParentLinks(content)));
    act(() => editor().actions.move('s1', 'ROOT', 2));
    const saved = editor().query.serialize();
    const reloaded = JSON.parse(saved);
    // parents are now persisted by autosave's serialize — the stored JSON self-heals
    for (const id of nonRoot) expect(reloaded[id].parent).toBeTruthy();
  });
});

it('keeps ROOT parentless and preserves an existing correct tree unchanged', () => {
  const tree = { ROOT: { nodes: ['a'], linkedNodes: {} }, a: { parent: 'ROOT', nodes: [], linkedNodes: {} } };
  expect(JSON.parse(withParentLinks(tree))).toEqual(tree);
});
