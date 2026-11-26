import { expect, test } from 'vitest';
import { indexWikilinkExamples, type HastNode } from './rehype-index-wikilinks';

const titles = new Map([['llm-wiki', 'LLM wiki']]);

test('code keeps the brackets on the page and the index text is plain', () => {
  const tree: HastNode = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'pre',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: '[[llm-wiki]]\n[[llm-wiki|LLM wiki]]' }],
          },
        ],
      },
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          { type: 'text', value: 'why ' },
          {
            type: 'element',
            tagName: 'code',
            properties: {},
            children: [{ type: 'text', value: '[[missing-page]]' }],
          },
          { type: 'text', value: ' is text' },
        ],
      },
    ],
  };

  indexWikilinkExamples(tree, titles);

  const fence = tree.children?.[0];
  const indexedFence = tree.children?.[1];
  expect(fence?.properties?.dataPagefindIgnore).toBe('all');
  expect(fence?.children?.[0]?.children?.[0]?.value).toBe('[[llm-wiki]]\n[[llm-wiki|LLM wiki]]');
  expect(indexedFence?.tagName).toBe('span');
  expect(indexedFence?.properties?.ariaHidden).toBe('true');
  expect(indexedFence?.children?.[0]?.value).toBe('LLM wiki\nLLM wiki');

  const paragraph = tree.children?.[2];
  expect(paragraph?.children?.[1]?.properties?.dataPagefindIgnore).toBe('all');
  expect(paragraph?.children?.[1]?.children?.[0]?.value).toBe('[[missing-page]]');
  expect(paragraph?.children?.[2]?.children?.[0]?.value).toBe('missing-page');
  expect(paragraph?.children?.[3]?.value).toBe(' is text');
});
