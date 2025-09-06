import { AuthManager } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

export function createAuthRoutes(appDatabase) {
  const authManager = new AuthManager(appDatabase);

  return {
    login: async (req) => {
      try {
        const body = await req.json();
        const { email } = body;

        if (!email || !isValidEmail(email)) {
          return new Response(
            JSON.stringify({ error: "Valid email address is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const result = await authManager.sendMagicLink(email);

        const responseData = {
          message: "Magic link sent to your email address",
          email: email,
        };

        // Include magic link URL in development/test mode for easy testing
        if (result.magicLinkUrl) {
          responseData.magicLinkUrl = result.magicLinkUrl;
        }

        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logger.error("Login error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to send magic link" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },

    verify: async (req) => {
      try {
        const url = new URL(req.url);
        const token = url.searchParams.get("token");

        if (!token) {
          return new Response(JSON.stringify({ error: "Token is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let result;
        try {
          result = await authManager.verifyToken(token);
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const cookieHeader = createSessionCookie(result.sessionId);

        return new Response(null, {
          status: 302,
          headers: {
            "Set-Cookie": cookieHeader,
            Location: "/",
          },
        });
      } catch (error) {
        logger.error("Verify error:", error);
        return new Response(
          JSON.stringify({ error: "Token verification failed" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    },

    status: async (req) => {
      try {
        const sessionToken = req.cookies?.get?.("session");

        if (!sessionToken) {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const user = await authManager.validateSession(sessionToken);

        if (!user) {
          // Create an expired session cookie to clear it
          const expiredCookie = new Bun.Cookie("session", "", {
            path: "/",
            httpOnly: true,
            maxAge: 0,
            sameSite: "strict",
          });

          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": expiredCookie.toString(),
            },
          });
        }

        return new Response(
          JSON.stringify({
            authenticated: true,
            user: { email: user.email },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } catch (error) {
        logger.error("Status error:", error);
        return new Response(JSON.stringify({ authenticated: false }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },

    logout: async (req) => {
      try {
        const sessionToken = req.cookies?.get?.("session");

        if (sessionToken) {
          await authManager.logout(sessionToken);
        }

        // Create an expired session cookie to clear it
        const expiredCookie = new Bun.Cookie("session", "", {
          path: "/",
          httpOnly: true,
          maxAge: 0,
          sameSite: "strict",
        });

        return new Response(
          JSON.stringify({ message: "Logged out successfully" }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": expiredCookie.toString(),
            },
          },
        );
      } catch (error) {
        logger.error("Logout error:", error);
        return new Response(JSON.stringify({ error: "Logout failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function createSessionCookie(sessionId) {
  // Create secure HTTP-only cookie using Bun's Cookie class
  const cookie = new Bun.Cookie("session", sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return cookie.toString();
}
