import { AuthManager } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

export function createAuthRoutes(appDatabase) {
  const authManager = new AuthManager(appDatabase);

  return {
    // POST /api/auth/login - Send magic link
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

        // Send magic link (this handles both token generation and email sending)
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

    // GET /api/auth/verify?token=... - Verify magic link and create session
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

        // Validate token and create session
        let result;
        try {
          result = await authManager.verifyToken(token);
        } catch (error) {
          // All verifyToken errors are validation errors, return 400
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Set HTTP-only session cookie
        const cookieHeader = createSessionCookie(result.sessionId);

        // Redirect to dashboard after successful authentication
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

    // GET /api/auth/status - Check current authentication status
    status: async (req) => {
      try {
        // Extract session token from cookies
        const cookies = parseCookies(req.headers.get("cookie") || "");
        const sessionToken = cookies.session;

        if (!sessionToken) {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Validate session
        const user = await authManager.validateSession(sessionToken);

        if (!user) {
          return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie":
                "session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict",
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

    // POST /api/auth/logout - Clear session
    logout: async (req) => {
      try {
        // Extract session token from cookies
        const cookies = parseCookies(req.headers.get("cookie") || "");
        const sessionToken = cookies.session;

        if (sessionToken) {
          // Clean up session in database
          await authManager.logout(sessionToken);
        }

        // Clear session cookie
        return new Response(
          JSON.stringify({ message: "Logged out successfully" }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie":
                "session=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict",
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
  // Create secure HTTP-only cookie
  const cookieParts = [
    `session=${sessionId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];

  // Add Secure flag for HTTPS in production
  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
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
