import type { APIRoute } from 'astro';
import { graphJsonBody } from '../lib/graph-document';

export const GET: APIRoute = () => {
  return new Response(graphJsonBody(), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
