export class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authCheckPromise = null;
  }

  async checkAuthStatus() {
    if (this.authCheckPromise) {
      return this.authCheckPromise;
    }

    this.authCheckPromise = this._performAuthCheck();
    return this.authCheckPromise;
  }

  async _performAuthCheck() {
    try {
      const response = await fetch("/api/auth/status", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`);
      }

      const data = await response.json();

      this.isAuthenticated = data.authenticated;
      this.currentUser = data.user || null;

      return {
        isAuthenticated: this.isAuthenticated,
        user: this.currentUser,
      };
    } catch (error) {
      console.error("Auth status check failed:", error);
      this.isAuthenticated = false;
      this.currentUser = null;
      return {
        isAuthenticated: false,
        user: null,
      };
    } finally {
      this.authCheckPromise = null;
    }
  }

  async login(email) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Login failed: ${response.status}`);
      }

      return {
        success: true,
        message: data.message,
        email: data.email,
        magicLinkUrl: data.magicLinkUrl, // Available in development/test mode
      };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async logout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Logout failed: ${response.status}`);
      }

      this.isAuthenticated = false;
      this.currentUser = null;

      return {
        success: true,
        message: data.message,
      };
    } catch (error) {
      console.error("Logout failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  createAuthenticatedFetch() {
    return async (url, options = {}) => {
      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (response.status === 401) {
        this.isAuthenticated = false;
        this.currentUser = null;

        window.dispatchEvent(new CustomEvent("auth:session-expired"));

        throw new Error("Authentication required");
      }

      return response;
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
    };
  }

  onAuthChange(callback) {
    const handleAuthChange = (event) => {
      callback(event.detail);
    };

    window.addEventListener("auth:status-changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth:status-changed", handleAuthChange);
    };
  }

  _notifyAuthChange() {
    window.dispatchEvent(
      new CustomEvent("auth:status-changed", {
        detail: {
          isAuthenticated: this.isAuthenticated,
          user: this.currentUser,
        },
      }),
    );
  }

  _updateAuthState(isAuthenticated, user = null) {
    const wasAuthenticated = this.isAuthenticated;

    this.isAuthenticated = isAuthenticated;
    this.currentUser = user;

    if (wasAuthenticated !== isAuthenticated) {
      this._notifyAuthChange();
    }
  }
}
