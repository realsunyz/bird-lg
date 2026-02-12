export interface LocalizedText {
  en: string;
  zh?: string;
}

export interface ServerConfig {
  id: string;
  name: LocalizedText;
  descr: LocalizedText;
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
