export function startWebsiteServer(options: { routes: string[] }): Promise<{
  baseUrl: string;
  close(): Promise<void>;
}>;
