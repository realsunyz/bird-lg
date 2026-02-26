import { createContext, useContext, type ReactNode } from "react";
import { type ClientConfig } from "@/lib/types";

const ConfigContext = createContext<ClientConfig | null>(null);

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}

interface ConfigProviderProps {
  value: ClientConfig;
  children: ReactNode;
}

export function ConfigProvider({ value, children }: ConfigProviderProps) {
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}
