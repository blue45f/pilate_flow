// Exact consumed SDK signatures for local checks; the deployed SDK is platform supplied.
declare module '@appdeploy/sdk' {
  export interface RouterContext {
    body: unknown;
    query: Record<string, string>;
    params: Record<string, string>;
    event: unknown;
    user?: { userId: string; email?: string; name?: string; scope: string };
  }
  export interface RouterResponse {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }
  export type RouterMiddleware = (
    context: RouterContext,
  ) => Promise<RouterResponse | void> | RouterResponse | void;
  export function router(
    routes: Record<string, RouterMiddleware[]>,
  ): (event: unknown) => Promise<RouterResponse>;
  export function requireAuth(): RouterMiddleware;
  export function json(data: unknown, status?: number): RouterResponse;
  export function error(message: string, status?: number): RouterResponse;
  export function isAppDatabaseError(
    cause: unknown,
  ): cause is Error & { code: string; statusCode: number };
  interface DbOperation<T> extends PromiseLike<T> {
    catch: Promise<T>['catch'];
    finally: Promise<T>['finally'];
  }
  export const db: {
    get<T>(
      table: string,
      ids: string[],
      options?: { consistent?: boolean },
    ): Promise<Array<T | null>>;
    tx: {
      add(table: string, records: Record<string, unknown>[]): DbOperation<Array<string | null>>;
      update(
        table: string,
        items: Array<{ id: string; record: Record<string, unknown>; if?: Record<string, unknown> }>,
        options?: { patch?: boolean },
      ): DbOperation<boolean[]>;
    };
  };
  export const storage: {
    write(items: Array<{ path: string; content: string; contentType: string }>): Promise<boolean[]>;
    read(paths: string[]): Promise<Array<{ path: string; content: string | null }>>;
    delete(paths: string[]): Promise<boolean[]>;
  };
}
