import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';

const require = createRequire(import.meta.url);

export type MermaidTheme = 'dark' | 'neutral';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.CHROME_BIN,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/opt/google/chrome/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

let browserPromise: Promise<Browser> | null = null;
let pagePromise: Promise<Page> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let sequence = 0;

function chromeExecutable(): string {
  const found = CHROME_CANDIDATES.find((candidate) => candidate && existsSync(candidate));
  if (!found) {
    throw new Error(
      'Mermaid rendering needs Chrome. Install Google Chrome or set CHROME_PATH to the executable.',
    );
  }
  return found;
}

function mermaidScriptPath(): string {
  return require.resolve('mermaid/dist/mermaid.min.js');
}

async function openPage(): Promise<Page> {
  const browser = await puppeteer.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  browserPromise = Promise.resolve(browser);
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>', { waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ path: mermaidScriptPath() });
    return page;
  } catch (error) {
    browserPromise = null;
    await browser.close();
    throw error;
  }
}

async function browserPage(): Promise<Page> {
  if (!pagePromise) {
    pagePromise = openPage().catch((error: unknown) => {
      pagePromise = null;
      browserPromise = null;
      throw error;
    });
  }
  return pagePromise;
}

/** Drop the shared browser. Safe to call when none was opened. */
export async function closeMermaidBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  pagePromise = null;
  if (!pending) return;
  try {
    const browser = await pending;
    await browser.close();
  } catch {
    // The browser is already gone.
  }
}

const THEME_VARIABLES: Record<MermaidTheme, Record<string, string>> = {
  dark: {
    background: '#090b10',
    fontFamily: 'Inter, sans-serif',
  },
  neutral: {
    background: '#ffffff',
    fontFamily: 'Inter, sans-serif',
  },
};

async function renderOnPage(source: string, theme: MermaidTheme, id: string): Promise<string> {
  const page = await browserPage();
  return page.evaluate(
    async (diagram, themeName, elementId, variables) => {
      const api = (
        globalThis as {
          mermaid?: {
            initialize: (config: unknown) => void;
            render: (id: string, text: string) => Promise<{ svg: string }>;
          };
        }
      ).mermaid;
      if (!api) throw new Error('Mermaid did not load in the browser');
      api.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: themeName,
        themeVariables: variables,
      });
      const rendered = await api.render(elementId, diagram);
      return rendered.svg;
    },
    source,
    theme,
    id,
    THEME_VARIABLES[theme],
  );
}

/** Confirm the built panel still parses in a browser, styles and all. */
export async function hiddenMermaidSource(html: string): Promise<boolean> {
  const host = await browserPage();
  const page = await host.browser().newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return page.evaluate(() => {
      const source = document.querySelector('[data-mermaid-source]');
      const dark = document.querySelector('[data-mermaid-theme="dark"] svg');
      const light = document.querySelector('[data-mermaid-theme="light"] svg');
      return Boolean(source?.hasAttribute('hidden') && dark && light);
    });
  } finally {
    await page.close();
  }
}

/** Render one diagram. Calls are serialized on a single Chrome page. */
export function renderMermaidSvg(source: string, theme: MermaidTheme): Promise<string> {
  const id = `kbwiki${++sequence}${theme}`;
  const run = renderQueue.then(() => renderOnPage(source, theme, id));
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
