/** The panel label uses the diagram kind from the first line of the fence. */
export function mermaidDiagramType(source: string): string {
  const line = source
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !entry.startsWith('%%'));
  if (!line) return 'diagram';
  const head = line.split(/[\s:{]/)[0]?.toLowerCase() ?? 'diagram';
  if (head === 'graph' || head === 'flowchart') return 'flowchart';
  if (head === 'sequencediagram') return 'sequence';
  if (head === 'classdiagram') return 'class';
  if (head === 'statediagram' || head === 'statediagram-v2') return 'state';
  if (head === 'erdiagram') return 'er';
  if (head === 'gitgraph') return 'git';
  if (head === 'quadrantchart') return 'quadrant';
  if (head === 'xychart' || head === 'xychart-beta') return 'xy';
  if (head === 'block' || head === 'block-beta') return 'block';
  if (head === 'packet' || head === 'packet-beta') return 'packet';
  if (head === 'requirementdiagram') return 'requirement';
  if (head === 'architecture' || head === 'architecture-beta') return 'architecture';
  if (head.startsWith('c4')) return 'c4';
  return head;
}
