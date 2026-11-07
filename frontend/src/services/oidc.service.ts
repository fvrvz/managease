import { UserManager, WebStorageStateStore, type User as OidcUser } from 'oidc-client-ts';
import { getRuntimeConfig } from '@/config/runtimeConfig';

let userManagerInstance: UserManager | null = null;

export function getOidcUserManager(): UserManager | null {
  const config = getRuntimeConfig().oidc;
  if (!config.enabled || !config.authority || !config.clientId) {
    return null;
  }

  if (!userManagerInstance) {
    userManagerInstance = new UserManager({
      authority: config.authority,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      post_logout_redirect_uri: config.postLogoutRedirectUri,
      response_type: config.responseType || 'code',
      scope: config.scope || 'openid profile email',
      // Store OIDC tokens and states strictly in sessionStorage instead of localStorage
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
      loadUserInfo: true,
      automaticSilentRenew: false,
    });
  }

  return userManagerInstance;
}

/**
 * Initiates the OIDC Authorization Code Flow with PKCE.
 */
export async function loginWithOidc(): Promise<void> {
  const userManager = getOidcUserManager();
  if (!userManager) {
    throw new Error('OIDC is not enabled or properly configured.');
  }
  await userManager.signinRedirect();
}

/**
 * Handles the OIDC redirect callback by exchanging code and PKCE verifier for tokens.
 */
export async function handleOidcCallback(): Promise<OidcUser | null> {
  const userManager = getOidcUserManager();
  if (!userManager) {
    throw new Error('OIDC is not enabled or properly configured.');
  }
  const user = await userManager.signinCallback();
  return user ?? null;
}

/**
 * Initiates OIDC signout at the identity provider end-session endpoint.
 */
export async function logoutWithOidc(): Promise<void> {
  const userManager = getOidcUserManager();
  if (userManager) {
    try {
      await userManager.signoutRedirect();
      return;
    } catch {
      // Fallback to clearing local session
    }
  }
  window.sessionStorage.clear();
  window.location.href = '/login';
}

/**
 * Returns the currently authenticated OIDC user from sessionStorage, if any.
 */
export async function getActiveOidcUser(): Promise<OidcUser | null> {
  const userManager = getOidcUserManager();
  if (!userManager) return null;
  return await userManager.getUser();
}
