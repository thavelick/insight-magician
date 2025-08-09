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
    );
    this.schemaComponent = new SchemaComponent();

    // Hide schema sidebar initially
    this.schemaComponent.hide();

    // Set up action buttons
    this.setupAddWidgetButton();
    this.setupViewSchemaButton();

    // Check for existing database in sessionStorage
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
    );

    this.widgets.set(widgetId, widget);

    const container = document.getElementById("widgets-container");
    if (container) {
      container.appendChild(widget.getElement());
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
            );
            this.widgets.set(data.id, widget);
            container.appendChild(widget.getElement());
          }
        }
      } catch (error) {
        console.error("Failed to load widgets:", error);
        sessionStorage.removeItem("widgets");
      }
    }
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
  new App();
});
