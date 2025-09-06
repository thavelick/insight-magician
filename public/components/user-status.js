export class UserStatusComponent {
  constructor(authService) {
    this.authService = authService;
    this.element = null;
    this.isLoggingOut = false;
  }

  render(user) {
    if (this.element) {
      this.update(user);
      return this.element;
    }

    this.element = document.createElement("div");
    this.element.className = "user-status";
    this._renderContent(user);
    this._attachEventListeners();

    return this.element;
  }

  update(user) {
    if (this.element) {
      this._renderContent(user);
    }
  }

  _renderContent(user) {
    this.element.innerHTML = `
      <div class="user-info">
        <div class="user-avatar">
          ${this._getInitials(user.email)}
        </div>
        <div class="user-details">
          <span class="user-email">${user.email}</span>
          <span class="user-status-text">Signed in</span>
        </div>
      </div>
      
      <div class="user-actions">
        <button 
          type="button" 
          class="logout-button" 
          id="logoutButton"
          ${this.isLoggingOut ? "disabled" : ""}
        >
          <span class="logout-text" style="display: ${this.isLoggingOut ? "none" : "inline"}">
            Sign Out
          </span>
          <span class="logout-loading" style="display: ${this.isLoggingOut ? "flex" : "none"}">
            <span class="spinner"></span>
            Signing out...
          </span>
        </button>
      </div>
    `;
  }

  _attachEventListeners() {
    this.element.addEventListener("click", async (e) => {
      if (e.target.closest("#logoutButton")) {
        e.preventDefault();
        await this._handleLogout();
      }
    });
  }

  async _handleLogout() {
    if (this.isLoggingOut) {
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (!confirmed) {
      return;
    }

    this._setLoggingOut(true);

    try {
      const result = await this.authService.logout();

      if (result.success) {
        // The main app will handle the redirect to login
        window.dispatchEvent(new CustomEvent("auth:logout-success"));
      } else {
        console.error("Logout failed:", result.error);
        alert("Failed to sign out. Please try again.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("An error occurred while signing out. Please try again.");
    } finally {
      this._setLoggingOut(false);
    }
  }

  _setLoggingOut(loggingOut) {
    this.isLoggingOut = loggingOut;

    const button = this.element.querySelector("#logoutButton");
    const logoutText = this.element.querySelector(".logout-text");
    const logoutLoading = this.element.querySelector(".logout-loading");

    if (button) {
      button.disabled = loggingOut;

      if (logoutText) {
        logoutText.style.display = loggingOut ? "none" : "inline";
      }

      if (logoutLoading) {
        logoutLoading.style.display = loggingOut ? "flex" : "none";
      }
    }
  }

  _getInitials(email) {
    if (!email) return "?";

    // Get the part before @ and take first 2 characters
    const username = email.split("@")[0];
    const initials = username.substring(0, 2).toUpperCase();

    return initials;
  }

  destroy() {
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
