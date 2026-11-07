export interface OidcConfig {
  enabled: boolean;
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
  responseType?: string;
  prompt?: string;
}

export interface AppRuntimeConfig {
  apiBaseUrl: string;
  oidc: OidcConfig;
}

const getDefaultConfig = (): AppRuntimeConfig => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return {
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    oidc: {
      enabled: import.meta.env.VITE_OIDC_ENABLED === 'true',
      authority: import.meta.env.VITE_OIDC_AUTHORITY ?? '',
      clientId: import.meta.env.VITE_OIDC_CLIENT_ID ?? '',
      redirectUri: import.meta.env.VITE_OIDC_REDIRECT_URI ?? `${origin}/auth/callback`,
      postLogoutRedirectUri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI ?? `${origin}/login`,
      scope: import.meta.env.VITE_OIDC_SCOPE ?? 'openid profile email',
      responseType: 'code',
    },
  };
};

let currentConfig: AppRuntimeConfig = getDefaultConfig();

/**
 * Initializes runtime configuration by fetching /config.json at startup.
 * Falls back to environment variables if the file is unreachable or invalid.
 */
export async function initRuntimeConfig(): Promise<AppRuntimeConfig> {
  const defaults = getDefaultConfig();
  try {
    const res = await fetch('/config.json', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<AppRuntimeConfig>;
      currentConfig = {
        apiBaseUrl: (data.apiBaseUrl ?? defaults.apiBaseUrl).replace(/\/+$/, ''),
        oidc: {
          ...defaults.oidc,
          ...(data.oidc ?? {}),
        },
      };
      return currentConfig;
    }
  } catch {
    // If fetching fails (e.g. running vite dev server without config.json), use defaults
  }
  currentConfig = defaults;
  return currentConfig;
}

export function getRuntimeConfig(): AppRuntimeConfig {
  return currentConfig;
}
