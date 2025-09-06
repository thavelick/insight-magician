import { AuthManager } from "../auth.js";
import { logger } from "../logger.js";

export function requireAuth(appDatabase) {
  const authManager = new AuthManager(appDatabase);

  return async function authMiddleware(req, url, response) {
    try {
      const sessionToken = req.cookies?.get?.("session");

      if (!sessionToken) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

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

      return null;
    } catch (error) {
      logger.error("Auth middleware error:", error);
      return new Response(JSON.stringify({ error: "Authentication error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}

