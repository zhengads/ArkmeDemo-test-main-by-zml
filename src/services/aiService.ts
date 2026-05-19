export interface AiConfig {
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
}

export const AI_CONFIG_KEYS = {
  provider: "arkme-demo.ai-provider",
  apiKey: "arkme-demo.ai-api-key",
  endpoint: "arkme-demo.ai-endpoint",
  model: "arkme-demo.ai-model",
};

export const DEFAULT_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    defaultEndpoint: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    defaultEndpoint: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultEndpoint: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  {
    id: "custom",
    name: "Custom (自定义)",
    defaultEndpoint: "",
    defaultModel: "",
  },
];

export interface AiConfigProfile {
  id: string;
  name: string;
  config: AiConfig;
}

export function getAiProfiles(): AiConfigProfile[] {
  if (typeof window === "undefined") {
    return [];
  }
  const saved = window.localStorage.getItem("arkme-demo.ai-profiles");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }

  // If none exists, migrate/create from legacy single config
  const legacyConfig = {
    provider: window.localStorage.getItem(AI_CONFIG_KEYS.provider) || "openai",
    apiKey: window.localStorage.getItem(AI_CONFIG_KEYS.apiKey) || "",
    endpoint: window.localStorage.getItem(AI_CONFIG_KEYS.endpoint) || "",
    model: window.localStorage.getItem(AI_CONFIG_KEYS.model) || "",
  };
  const defaultProfile: AiConfigProfile = {
    id: "default",
    name: "默认配置",
    config: legacyConfig,
  };
  const profiles = [defaultProfile];
  window.localStorage.setItem("arkme-demo.ai-profiles", JSON.stringify(profiles));
  window.localStorage.setItem("arkme-demo.ai-active-profile-id", "default");
  return profiles;
}

export function saveAiProfiles(profiles: AiConfigProfile[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("arkme-demo.ai-profiles", JSON.stringify(profiles));
}

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return "default";
  let activeId = window.localStorage.getItem("arkme-demo.ai-active-profile-id");
  if (!activeId) {
    const profiles = getAiProfiles();
    activeId = profiles[0]?.id || "default";
    window.localStorage.setItem("arkme-demo.ai-active-profile-id", activeId);
  }
  return activeId;
}

export function setActiveProfileId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("arkme-demo.ai-active-profile-id", id);

  // Sync to legacy keys too
  const profiles = getAiProfiles();
  const activeProfile = profiles.find((p) => p.id === id);
  if (activeProfile) {
    window.localStorage.setItem(AI_CONFIG_KEYS.provider, activeProfile.config.provider);
    window.localStorage.setItem(AI_CONFIG_KEYS.apiKey, activeProfile.config.apiKey);
    window.localStorage.setItem(AI_CONFIG_KEYS.endpoint, activeProfile.config.endpoint);
    window.localStorage.setItem(AI_CONFIG_KEYS.model, activeProfile.config.model);
  }

  window.dispatchEvent(new Event("arkme-demo.ai-config-changed"));
}

export function getAiConfig(): AiConfig {
  if (typeof window === "undefined") {
    return { provider: "openai", apiKey: "", endpoint: "", model: "" };
  }
  const profiles = getAiProfiles();
  const activeId = getActiveProfileId();
  const activeProfile = profiles.find((p) => p.id === activeId);
  if (activeProfile) {
    return activeProfile.config;
  }
  return { provider: "openai", apiKey: "", endpoint: "", model: "" };
}

export function saveAiConfig(config: AiConfig) {
  if (typeof window === "undefined") return;
  const profiles = getAiProfiles();
  const activeId = getActiveProfileId();
  const updatedProfiles = profiles.map((p) => {
    if (p.id === activeId) {
      return { ...p, config };
    }
    return p;
  });
  saveAiProfiles(updatedProfiles);

  // Sync to legacy keys too
  window.localStorage.setItem(AI_CONFIG_KEYS.provider, config.provider);
  window.localStorage.setItem(AI_CONFIG_KEYS.apiKey, config.apiKey);
  window.localStorage.setItem(AI_CONFIG_KEYS.endpoint, config.endpoint);
  window.localStorage.setItem(AI_CONFIG_KEYS.model, config.model);

  window.dispatchEvent(new Event("arkme-demo.ai-config-changed"));
}

export async function requestChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  customConfig?: Partial<AiConfig>
): Promise<string> {
  const config = { ...getAiConfig(), ...customConfig };
  
  if (!config.apiKey) {
    throw new Error("API Key is missing. Please configure it in Settings -> AI API Configuration.");
  }

  // Resolve base URL/endpoint
  let baseUrl = config.endpoint.trim();
  if (!baseUrl) {
    const matchedProvider = DEFAULT_PROVIDERS.find((p) => p.id === config.provider);
    baseUrl = matchedProvider ? matchedProvider.defaultEndpoint : "https://api.openai.com/v1";
  }

  // Resolve model name
  let modelName = config.model.trim();
  if (!modelName) {
    const matchedProvider = DEFAULT_PROVIDERS.find((p) => p.id === config.provider);
    modelName = matchedProvider ? matchedProvider.defaultModel : "gpt-4o-mini";
  }

  // Clean trailing slashes and normalize endpoint path
  let url = baseUrl;
  if (!url.endsWith("/chat/completions")) {
    url = url.replace(/\/+$/, "") + "/chat/completions";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    let errorText = "";
    try {
      const errorJson = await response.json();
      errorText = errorJson.error?.message || response.statusText;
    } catch {
      errorText = (await response.text()) || response.statusText;
    }
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error("Invalid API response format");
  }

  return choice.message.content;
}
