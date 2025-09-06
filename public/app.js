import { logger } from "../lib/logger.js";
import { AIChatComponent } from "./components/ai-chat.js";
import { LoginComponent } from "./components/login.js";
import { SchemaComponent } from "./components/schema.js";
import { UploadComponent } from "./components/upload.js";
import { UserStatusComponent } from "./components/user-status.js";
import { WidgetComponent } from "./components/widget.js";
import { AuthService } from "./lib/auth-service.js";

class App {
  constructor() {
    this.currentDatabase = null;
    this.schema = null;
    this.widgets = new Map();
    this.nextWidgetId = 1;

    this.authService = new AuthService();
    this.loginComponent = null;
    this.userStatusComponent = null;
    this.isAuthenticated = false;
    this.currentUser = null;

    this.init();
  }

  async init() {
    this.setupAuthEventListeners();

    await this.checkAuthentication();

    this.setupMainApp();
  }

  async setupMainApp() {
    this.uploadComponent = new UploadComponent(
      this.onDatabaseUploaded.bind(this),
      this.hideUploadArea.bind(this),
    );
    this.schemaComponent = new SchemaComponent();
    this.aiChatComponent = new AIChatComponent();

    this.schemaComponent.hide();
    this.aiChatComponent.show();
    this.setupAddWidgetButton();
    this.setupAIChatButton();
    this.setupViewSchemaButton();
    this.setupToggleUploadButton();

    if (this.isAuthenticated) {
      this.setupUserStatus();
    } else {
      this.setupSignInLink();
    }

    await this.checkExistingDatabase();
  }

  setupAuthEventListeners() {
    window.addEventListener("auth:session-expired", () => {
      this.handleSessionExpired();
    });

    window.addEventListener("auth:logout-success", () => {
      this.handleLogoutSuccess();
    });
  }

  async checkAuthentication() {
    try {
      const authStatus = await this.authService.checkAuthStatus();
      this.isAuthenticated = authStatus.isAuthenticated;
      this.currentUser = authStatus.user;
    } catch (error) {
      logger.error("Authentication check failed:", error);
      this.isAuthenticated = false;
      this.currentUser = null;
    }
  }

  showLoginScreen() {
    if (!this.loginComponent) {
      this.loginComponent = new LoginComponent(this.authService);
    }

    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = "";
      appContainer.appendChild(this.loginComponent.render());
    }

    this.handleMagicLinkVerification();
  }

  async handleMagicLinkVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      this.showVerificationLoading();

      try {
        const response = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json();

        if (response.ok) {
          this.isAuthenticated = true;
          this.currentUser = data.user;

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );

          await this.setupMainApp();
        } else {
          this.showVerificationError(
            data.error || "Invalid or expired magic link",
          );
        }
      } catch (error) {
        logger.error("Magic link verification failed:", error);
        this.showVerificationError(
          "Failed to verify magic link. Please try again.",
        );
      }
    }
  }

  showVerificationLoading() {
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="verification-loading">
          <div class="verification-card">
            <div class="spinner"></div>
            <h2>Verifying your magic link...</h2>
            <p>Please wait while we sign you in.</p>
          </div>
        </div>
      `;
    }
  }

  showVerificationError(error) {
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="verification-error">
          <div class="verification-card">
            <h2>Verification Failed</h2>
            <p class="error-message">${error}</p>
            <button onclick="window.location.reload()" class="retry-button">
              Try Again
            </button>
          </div>
        </div>
      `;
    }
  }

  showMainApp() {
    const appContainer = document.getElementById("app");
    if (appContainer) {
      appContainer.innerHTML = `
        <div class="container">
          <header class="app-header">
            <h1>🔍 Insight Magician</h1>
            <div class="main-buttons">
              <button class="ai-chat-btn" id="ai-chat">🤖 AI Chat</button>
              <button class="view-schema-btn" id="view-schema" style="display: none;">📐 View Schema</button>
              <button class="toggle-upload-btn" id="toggle-upload" style="display: none;">📁 Change Database</button>
              <button class="add-widget-btn" id="add-widget">+ Add Widget</button>
            </div>
          </header>
          
          <div class="upload-area">
            <button class="close-upload" title="Close">✕</button>
            <p>Drop your SQLite database file here</p>
            <p><small>Or click to select a file</small></p>
          </div>
          <div id="widgets-container">
          </div>
        </div>
      `;
    }
  }

  setupUserStatus() {
    if (!this.currentUser) return;

    if (!this.userStatusComponent) {
      this.userStatusComponent = new UserStatusComponent(this.authService);
    }

    const header = document.querySelector("header");
    if (header) {
      let userStatusContainer = header.querySelector(".user-status-container");
      if (!userStatusContainer) {
        userStatusContainer = document.createElement("div");
        userStatusContainer.className = "user-status-container";
        header.appendChild(userStatusContainer);
      }

      userStatusContainer.innerHTML = "";
      userStatusContainer.appendChild(
        this.userStatusComponent.render(this.currentUser),
      );
    }
  }

  setupSignInLink() {
    const header = document.querySelector("header");
    if (header) {
      let userStatusContainer = header.querySelector(".user-status-container");
      if (!userStatusContainer) {
        userStatusContainer = document.createElement("div");
        userStatusContainer.className = "user-status-container";
        header.appendChild(userStatusContainer);
      }

      userStatusContainer.innerHTML = `
        <a href="#" class="sign-in-link">Sign In</a>
      `;

      const signInLink = userStatusContainer.querySelector(".sign-in-link");
      signInLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.showLoginScreen();
      });
    }
  }

  removeUserStatus() {
    const userStatusContainer = document.querySelector(
      ".user-status-container",
    );
    if (userStatusContainer) {
      userStatusContainer.remove();
    }
  }

  handleSessionExpired() {
    this.isAuthenticated = false;
    this.currentUser = null;

    this.clearApplicationData();
    this.removeUserStatus();
    this.setupSignInLink();
  }

  handleLogoutSuccess() {
    this.isAuthenticated = false;
    this.currentUser = null;

    this.clearApplicationData();
    this.removeUserStatus();
    this.setupSignInLink();
  }

  clearApplicationData() {
    this.clearWidgets();
    this.currentDatabase = null;
    this.schema = null;

    sessionStorage.clear();
  }

  createAuthenticatedFetch() {
    return this.authService.createAuthenticatedFetch();
  }

  setupAddWidgetButton() {
    const addWidgetBtn = document.getElementById("add-widget");
    if (addWidgetBtn) {
      addWidgetBtn.addEventListener("click", () => {
        if (!this.currentDatabase) {
          alert("Please upload a database first");
          return;
        }
        this.addWidget();
      });
    }
  }

  setupAIChatButton() {
    const aiChatBtn = document.getElementById("ai-chat");
    if (aiChatBtn) {
      aiChatBtn.addEventListener("click", () => {
        this.aiChatComponent.show();
      });
    }
  }

  setupViewSchemaButton() {
    const viewSchemaBtn = document.getElementById("view-schema");
    if (viewSchemaBtn) {
      viewSchemaBtn.addEventListener("click", () => {
        if (this.schema) {
          this.schemaComponent.show();
        }
      });
    }
  }

  setupToggleUploadButton() {
    const toggleUploadBtn = document.getElementById("toggle-upload");
    if (toggleUploadBtn) {
      toggleUploadBtn.addEventListener("click", () => {
        this.toggleUploadArea();
      });
    }
  }

  async checkExistingDatabase() {
    const storedFilename = sessionStorage.getItem("currentDatabase");
    if (storedFilename) {
      await this.loadDatabase(storedFilename);
    }
  }

  async onDatabaseUploaded(filename) {
    await this.loadDatabase(filename);
  }

  async loadDatabase(filename) {
    this.currentDatabase = filename;

    try {
      const authenticatedFetch = this.createAuthenticatedFetch();
      const response = await authenticatedFetch(
        `/api/schema?filename=${encodeURIComponent(filename)}`,
      );
      const result = await response.json();

      if (result.success) {
        this.schema = result.schema;
        this.schemaComponent.displaySchema(this.schema);

        sessionStorage.setItem("currentDatabase", filename);

        this.showViewSchemaButton();

        this.loadWidgets();

        this.uploadComponent.showSuccess(
          `Database loaded: ${Object.keys(this.schema).length} tables found`,
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("Failed to load schema:", error);
      this.uploadComponent.showError("Failed to load database schema");
      sessionStorage.removeItem("currentDatabase");
      this.hideViewSchemaButton();
      this.clearWidgets();
    }
  }

  addWidget() {
    const widgetId = this.nextWidgetId++;
    const widget = new WidgetComponent(
      widgetId,
      (id) => this.removeWidget(id),
      () => this.saveWidgets(),
      2,
      2,
      this.currentDatabase,
      "",
      "data-table",
    );

    this.widgets.set(widgetId, widget);

    const container = document.getElementById("widgets-container");
    if (container) {
      container.appendChild(widget.getElement());
    }

    if (this.widgets.size === 1) {
      this.hideUploadArea();
    }

    setTimeout(() => {
      widget.flip();
      setTimeout(() => this.saveWidgets(), 200);
    }, 100);
  }

  removeWidget(id) {
    this.widgets.delete(id);
    this.saveWidgets();

    if (this.widgets.size === 0) {
      this.showUploadArea();
    }
  }

  hideUploadArea() {
    const uploadArea = document.querySelector(".upload-area");
    if (uploadArea) {
      uploadArea.style.display = "none";
    }
    this.showToggleUploadButton();
  }

  showUploadArea() {
    const uploadArea = document.querySelector(".upload-area");
    if (uploadArea) {
      uploadArea.style.display = "block";
    }
    this.hideToggleUploadButton();
  }

  showToggleUploadButton() {
    const toggleBtn = document.getElementById("toggle-upload");
    if (toggleBtn) {
      toggleBtn.style.display = "block";
    }
  }

  hideToggleUploadButton() {
    const toggleBtn = document.getElementById("toggle-upload");
    if (toggleBtn) {
      toggleBtn.style.display = "none";
    }
  }

  toggleUploadArea() {
    const uploadArea = document.querySelector(".upload-area");
    const isHidden = uploadArea.style.display === "none";

    if (isHidden) {
      this.showUploadArea();
    } else {
      this.hideUploadArea();
    }
  }

  showViewSchemaButton() {
    const viewSchemaBtn = document.getElementById("view-schema");
    if (viewSchemaBtn) {
      viewSchemaBtn.style.display = "block";
    }
  }

  hideViewSchemaButton() {
    const viewSchemaBtn = document.getElementById("view-schema");
    if (viewSchemaBtn) {
      viewSchemaBtn.style.display = "none";
    }
  }

  saveWidgets() {
    const widgetData = Array.from(this.widgets.values()).map((widget) =>
      widget.serialize(),
    );
    sessionStorage.setItem("widgets", JSON.stringify(widgetData));
    sessionStorage.setItem("nextWidgetId", this.nextWidgetId.toString());
  }

  loadWidgets() {
    const savedWidgets = sessionStorage.getItem("widgets");
    const savedNextId = sessionStorage.getItem("nextWidgetId");

    if (savedNextId) {
      this.nextWidgetId = Number.parseInt(savedNextId, 10);
    }

    if (savedWidgets) {
      try {
        const widgetData = JSON.parse(savedWidgets);
        const container = document.getElementById("widgets-container");

        if (container) {
          for (const data of widgetData) {
            const widget = WidgetComponent.deserialize(
              data,
              (id) => this.removeWidget(id),
              () => this.saveWidgets(),
              this.currentDatabase,
            );
            this.widgets.set(data.id, widget);
            container.appendChild(widget.getElement());
          }

          if (this.widgets.size > 0) {
            this.hideUploadArea();
          }
        }
      } catch (error) {
        logger.error("Failed to load widgets:", error);
        sessionStorage.removeItem("widgets");
      }
    }
  }

  /**
   * Get the current database path for tool execution
   * @returns {string|null} Database path or null if no database loaded
   */
  getCurrentDatabasePath() {
    if (!this.currentDatabase) {
      return null;
    }

    // Database files are stored in the uploads directory on the server
    return `./uploads/${this.currentDatabase}`;
  }

  /**
   * Get widget state information for tool execution
   * @returns {Array} Array of widget information objects
   */
  getWidgetListForTools() {
    const widgetInfo = Array.from(this.widgets.values()).map((widget) => ({
      id: widget.id,
      title: widget.title || `Widget ${widget.id}`,
      type: widget.widgetType || "data-table",
      query: widget.query || "",
      dimensions: {
        width: widget.width || 2,
        height: widget.height || 2,
      },
      hasResults: !!(widget.results?.rows && widget.results.rows.length > 0),
      resultCount: widget.results?.rows ? widget.results.rows.length : 0,
      isInEditMode: widget.isFlipped || false,
    }));

    return widgetInfo;
  }

  /**
   * Create a new widget from tool execution result
   * @param {Object} widgetConfig - Widget configuration from tool
   */
  createWidgetFromTool(widgetConfig) {
    try {
      const {
        id,
        title,
        widgetType,
        query,
        width = 2,
        height = 2,
        chartFunction,
        results,
      } = widgetConfig;

      const numericId = this.nextWidgetId++;

      const widget = new WidgetComponent(
        numericId,
        (id) => this.removeWidget(id),
        () => this.saveWidgets(),
        width,
        height,
        this.currentDatabase,
        title,
        widgetType,
      );

      widget.query = query;
      if (results) {
        widget.results = results;
        widget.hasResults = !!(results.rows && results.rows.length > 0);
      }

      if (widgetType === "graph" && chartFunction) {
        widget.chartFunction = chartFunction;
      }

      this.widgets.set(numericId, widget);

      const container = document.getElementById("widgets-container");
      if (container) {
        container.appendChild(widget.getElement());
      }

      widget.updateFormFields();

      if (results?.rows && results.rows.length > 0) {
        widget.displayResults(results);
      }

      this.saveWidgets();

      this.hideUploadArea();

      logger.debug(`Created widget ${numericId} from tool:`, {
        title,
        type: widgetType,
        rowCount: results?.rows?.length || 0,
      });

      return {
        success: true,
        widgetId: numericId,
        message: `Widget "${title}" created successfully`,
      };
    } catch (error) {
      logger.error("Error creating widget from tool:", error);
      return {
        success: false,
        error: `Failed to create widget: ${error.message}`,
      };
    }
  }

  /**
   * Update an existing widget from tool execution result
   * @param {Object} widgetConfig - Updated widget configuration from tool
   */
  updateWidgetFromTool(widgetConfig) {
    try {
      const {
        id,
        title,
        widgetType,
        query,
        width,
        height,
        chartFunction,
        results,
      } = widgetConfig;

      const existingWidget = this.widgets.get(id);
      if (!existingWidget) {
        return {
          success: false,
          error: `Widget with ID ${id} not found`,
        };
      }

      if (title !== undefined) {
        existingWidget.title = title;
      }
      if (widgetType !== undefined) {
        existingWidget.widgetType = widgetType;
      }
      if (query !== undefined) {
        existingWidget.query = query;
      }
      if (width !== undefined) {
        existingWidget.width = width;
      }
      if (height !== undefined) {
        existingWidget.height = height;
      }
      if (chartFunction !== undefined) {
        existingWidget.chartFunction = chartFunction;
      }

      if (results) {
        existingWidget.results = results;
        existingWidget.hasResults = !!(results.rows && results.rows.length > 0);
      }

      existingWidget.updateFormFields();

      const resultsToDisplay = results || existingWidget.results;
      if (resultsToDisplay?.rows && resultsToDisplay.rows.length > 0) {
        existingWidget.displayResults(resultsToDisplay);

        if (existingWidget.isFlipped) {
          existingWidget.flip();
        }
      }

      this.saveWidgets();

      logger.debug(`Updated widget ${id} from tool:`, {
        title: title || existingWidget.title,
        type: widgetType || existingWidget.widgetType,
        rowCount:
          results?.rows?.length || existingWidget.results?.rows?.length || 0,
      });

      return {
        success: true,
        widgetId: id,
        message: `Widget "${title || existingWidget.title}" updated successfully`,
      };
    } catch (error) {
      logger.error("Error updating widget from tool:", error);
      return {
        success: false,
        error: `Failed to update widget: ${error.message}`,
      };
    }
  }

  clearWidgets() {
    const container = document.getElementById("widgets-container");
    if (container) {
      container.innerHTML = "";
    }

    this.widgets.clear();

    this.nextWidgetId = 1;

    sessionStorage.removeItem("widgets");
    sessionStorage.removeItem("nextWidgetId");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
