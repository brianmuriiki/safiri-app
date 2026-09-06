declare namespace Deno {
  const env: {
    get(name: string): string | undefined;
  };

  function serve(handler: unknown): void;
}

declare module "jsr:@supabase/supabase-js@2.49.8" {
  export { createClient } from "@supabase/supabase-js";
}

declare module "npm:hono" {
  export interface Context {
    json(body: unknown): Response;
  }

  export class Hono {
    use(path: string, middleware: unknown): this;
    get(path: string, handler: (context: Context) => unknown): this;
    fetch: unknown;
  }
}

declare module "npm:hono/cors" {
  export function cors(options?: unknown): unknown;
}

declare module "npm:hono/logger" {
  export function logger(output?: (...args: unknown[]) => void): unknown;
}
