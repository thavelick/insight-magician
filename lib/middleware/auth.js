import { AuthManager } from "../auth.js";

export function requireAuth(appDatabase) {
  const authManager = new AuthManager(appDatabase);

  return async function authMiddleware(req, url, response) {
    try {
      // Extract session token from cookies
      const cookies = parseCookies(req.headers.get("cookie") || "");
      const sessionToken = cookies.session;

      if (!sessionToken) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Validate session and get user
      const user = await authManager.validateSession(sessionToken);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie":
                "session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict",
            },
          },
        );
      }

      // Add user to request context for use in route handlers
      req.user = user;

      // Continue to the actual route handler
      return null; // null means continue processing
    } catch (error) {
      console.error("Auth middleware error:", error);
      return new Response(JSON.stringify({ error: "Authentication error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;

  for (const cookie of cookieString.split(";")) {
    const [name, ...rest] = cookie.split("=");
    const value = rest.join("=").trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  }

  return cookies;
}
