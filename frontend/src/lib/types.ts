export interface ServerConfig {
  id: string;
  name: string;
  location: string;
  icon?: string;
}

export interface ClientConfig {
  turnstile: {
    siteKey: string;
  };
  logto: {
    endpoint: string;
    appId: string;
  };
  servers: ServerConfig[];
  app: {
    title: string;
  };
  auth?: {
    isAuthenticated: boolean;
    user?: string;
    authType?: string;
  };
}
