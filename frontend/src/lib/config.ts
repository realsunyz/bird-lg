// Server configuration
export interface ServerConfig {
  id: string;
  name: string;
  location: string;
  endpoint: string;
  icon?: string; // Custom 2-letter code or emoji (e.g. "TK", "🇯🇵")
}

export interface AppConfig {
  turnstile: {
    siteKey: string;
    secretKey: string;
  };
  hmac: {
    secret: string;
  };
  servers: ServerConfig[];
  app: {
    title: string;
    subtitle: string;
  };
}

// Load config from environment or defaults
export function getConfig(): AppConfig {
  return {
    turnstile: {
      siteKey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
      secretKey:
        process.env.TURNSTILE_SECRET_KEY ||
        "1x0000000000000000000000000000000AA",
    },
    hmac: {
      secret: process.env.HMAC_SECRET || "",
    },
    servers: JSON.parse(
      process.env.SERVERS ||
        '[{"id":"tokyo","name":"Tokyo","location":"Tokyo, JP","endpoint":"http://142.4.218.99:18000","icon":"🇯🇵"},{"id":"osaka","name":"Osaka","location":"Osaka, JP","endpoint":"http://142.4.218.99:18000","icon":"🇯🇵"},{"id":"kyoto","name":"Kyoto","location":"Kyoto, JP","endpoint":"http://142.4.218.99:18000","icon":"KY"},{"id":"nagoya","name":"Nagoya","location":"Nagoya, JP","endpoint":"http://142.4.218.99:18000","icon":"NG"},{"id":"fukuoka","name":"Fukuoka","location":"Fukuoka, JP","endpoint":"http://142.4.218.99:18000","icon":"🇯🇵"}]',
    ),
    app: {
      title: process.env.APP_TITLE || "BIRD Looking Glass",
      subtitle: process.env.APP_SUBTITLE || "Select a server to continue",
    },
  };
}

// Client-safe config (no secrets)
export function getClientConfig() {
  const config = getConfig();
  return {
    turnstile: { siteKey: config.turnstile.siteKey },
    servers: config.servers,
    app: config.app,
  };
}
