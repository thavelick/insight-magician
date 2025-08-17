import { AIChatComponent } from "./components/ai-chat.js";
import { SchemaComponent } from "./components/schema.js";
import { UploadComponent } from "./components/upload.js";
import { WidgetComponent } from "./components/widget.js";

class App {
  constructor() {
    this.currentDatabase = null;
    this.schema = null;
    this.widgets = new Map();
    this.nextWidgetId = 1;

    this.init();
  }

  async init() {
    this.uploadComponent = new UploadComponent(
      this.onDatabaseUploaded.bind(this),
      this.hideUploadArea.bind(this),
    );
    this.schemaComponent = new SchemaComponent();
    this.aiChatComponent = new AIChatComponent();

    // Show AI chat by default, hide schema sidebar
    this.schemaComponent.hide();
    this.aiChatComponent.show();
    this.setupAddWidgetButton();
    this.setupAIChatButton();
    this.setupViewSchemaButton();
    this.setupToggleUploadButton();
    await this.checkExistingDatabase();
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
      // Load schema
      const response = await fetch(
        `/api/schema?filename=${encodeURIComponent(filename)}`,
      );
      const result = await response.json();

      if (result.success) {
        this.schema = result.schema;
        this.schemaComponent.displaySchema(this.schema);
        this.schemaComponent.show();

        // Store database filename in sessionStorage
        sessionStorage.setItem("currentDatabase", filename);

        // Show View Schema button
        this.showViewSchemaButton();

        // Load saved widgets for this database
        this.loadWidgets();

        // Update upload component to show success
        this.uploadComponent.showSuccess(
          `Database loaded: ${Object.keys(this.schema).length} tables found`,
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to load schema:", error);
      this.uploadComponent.showError("Failed to load database schema");
      // Clear invalid filename from sessionStorage
      sessionStorage.removeItem("currentDatabase");
      // Hide View Schema button
      this.hideViewSchemaButton();
      // Clear widgets since database failed to load
      this.clearWidgets();
    }
  }

  addWidget() {
    const widgetId = this.nextWidgetId++;
    const widget = new WidgetComponent(
      widgetId,
      (id) => this.removeWidget(id),
      () => this.saveWidgets(),
      2, // width
      2, // height
      this.currentDatabase,
      "", // title
      "data-table", // widgetType
    );

    this.widgets.set(widgetId, widget);

    const container = document.getElementById("widgets-container");
    if (container) {
      container.appendChild(widget.getElement());
    }

    // Hide upload area after adding first widget
    if (this.widgets.size === 1) {
      this.hideUploadArea();
    }

    // Start the widget in edit mode (flipped)
    setTimeout(() => {
      widget.flip();
      // Save widgets after flip animation
      setTimeout(() => this.saveWidgets(), 200);
    }, 100);
  }

  removeWidget(id) {
    this.widgets.delete(id);
    this.saveWidgets();

    // Show upload area again if no widgets remain
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

  // Widget persistence methods
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

          // Hide upload area if widgets were loaded
          if (this.widgets.size > 0) {
            this.hideUploadArea();
          }
        }
      } catch (error) {
        console.error("Failed to load widgets:", error);
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

  clearWidgets() {
    // Remove all widget elements
    const container = document.getElementById("widgets-container");
    if (container) {
      container.innerHTML = "";
    }

    // Clear widgets map
    this.widgets.clear();

    // Reset widget ID counter
    this.nextWidgetId = 1;

    // Clear from sessionStorage
    sessionStorage.removeItem("widgets");
    sessionStorage.removeItem("nextWidgetId");
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
