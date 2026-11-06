// Local type boundary copied from the platform SDK reference. AppDeploy injects the runtime package.
declare module '@appdeploy/client' {
  export interface AuthUser {
    userId: string;
    email?: string;
    name?: string;
    picture?: string;
    scope: string;
  }
  export const auth: {
    getUser(): Promise<AuthUser | null>;
    signInWithRedirect(options?: { scope?: string }): Promise<void>;
    signOut(): Promise<void>;
  };
  export const api: {
    get(url: string, data?: unknown): Promise<{ data: unknown }>;
    post(url: string, data?: unknown): Promise<{ data: unknown }>;
    put(url: string, data?: unknown): Promise<{ data: unknown }>;
    delete(url: string, data?: unknown): Promise<{ data: unknown }>;
  };
}
