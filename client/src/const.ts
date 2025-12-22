export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Get Google OAuth login URL
 * Redirects to server-side OAuth initiation endpoint
 */
export const getLoginUrl = () => {
  // Use server-side endpoint to initiate Google OAuth flow
  // This avoids exposing client credentials and handles redirect properly
  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
  const redirectAfterLogin = typeof window !== "undefined" ? window.location.pathname : "/";
  
  // Encode the redirect path to return user to their original location after login
  const state = btoa(JSON.stringify({ redirect: redirectAfterLogin }));
  
  return `${currentUrl}/api/auth/google?state=${encodeURIComponent(state)}`;
};
