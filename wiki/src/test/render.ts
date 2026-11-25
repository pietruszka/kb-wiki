import reactRenderer from '@astrojs/react/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';

export async function renderPage(page: AstroComponentFactory, pathname: string): Promise<string> {
  const container = await AstroContainer.create({
    astroConfig: {
      site: 'https://pietruszka.github.io',
      base: '/kb-wiki',
    },
  });
  container.addServerRenderer({ renderer: reactRenderer });
  container.addClientRenderer({
    name: '@astrojs/react',
    entrypoint: '@astrojs/react/client.js',
  });
  return container.renderToString(page, {
    partial: false,
    request: new Request(`https://pietruszka.github.io${pathname}`),
  });
}
