const BOUND = 'data-mermaid-bound';

function eventElement(event: Event): Element | null {
  const target = event.target;
  if (!target || typeof target !== 'object') return null;
  if ('closest' in target && typeof (target as Element).closest === 'function') return target as Element;
  if ('parentElement' in target) return (target as Node).parentElement;
  return null;
}

/** Show or hide the fence that was rendered into the panel. */
export function toggleMermaidSource(panel: ParentNode): void {
  const source = panel.querySelector<HTMLElement>('[data-mermaid-source]');
  const button = panel.querySelector<HTMLElement>('[data-mermaid-action="source"]');
  if (!source || !button) return;
  const willOpen = source.hasAttribute('hidden');
  source.toggleAttribute('hidden', !willOpen);
  button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
}

/** Open a larger copy of the diagram. The same theme rules pick the visible SVG. */
export function expandMermaid(panel: ParentNode): void {
  const dialog = panel.querySelector('dialog');
  const canvas = panel.querySelector('[data-mermaid-dialog-canvas]');
  const live = panel.querySelector('.mermaid-canvas');
  if (!dialog || !canvas || !live) return;
  canvas.replaceChildren(...[...live.children].map((child) => child.cloneNode(true)));
  const modal = dialog as HTMLDialogElement;
  try {
    if (typeof modal.showModal === 'function' && !modal.open) modal.showModal();
    else modal.setAttribute('open', '');
  } catch {
    modal.setAttribute('open', '');
  }
}

export function closeMermaid(panel: ParentNode): void {
  const dialog = panel.querySelector('dialog');
  const canvas = panel.querySelector('[data-mermaid-dialog-canvas]');
  canvas?.replaceChildren();
  if (!dialog) return;
  const modal = dialog as HTMLDialogElement;
  if (typeof modal.close === 'function' && modal.open) modal.close();
  else modal.removeAttribute('open');
}

/** One listener for every panel on the page. */
export function bindMermaidPanels(doc: Document): void {
  if (doc.documentElement.hasAttribute(BOUND)) return;
  doc.documentElement.setAttribute(BOUND, '');
  doc.addEventListener('click', (event) => {
    const target = eventElement(event);
    if (!target) return;
    if (target.tagName === 'DIALOG' && target.classList.contains('mermaid-dialog')) {
      const panel = target.closest('[data-testid="wiki.mermaid"]');
      if (panel) closeMermaid(panel);
      return;
    }
    const button = target.closest<HTMLElement>('[data-mermaid-action]');
    if (!button) return;
    const panel = button.closest('[data-testid="wiki.mermaid"]');
    if (!panel) return;
    const action = button.dataset.mermaidAction;
    if (action === 'source') toggleMermaidSource(panel);
    if (action === 'expand') expandMermaid(panel);
    if (action === 'close') closeMermaid(panel);
  });
}
