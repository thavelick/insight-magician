import { SchemaComponent } from "./components/schema.js";
import { UploadComponent } from "./components/upload.js";

class App {
  constructor() {
    this.currentDatabase = null;
    this.schema = null;

    this.init();
  }

  async init() {
    this.uploadComponent = new UploadComponent(
      this.onDatabaseUploaded.bind(this),
    );
    this.schemaComponent = new SchemaComponent();

    // Hide schema sidebar initially
    this.schemaComponent.hide();

    // Check for existing database in sessionStorage
    await this.checkExistingDatabase();
  }

  async checkExistingDatabase() {
    const storedFilename = sessionStorage.getItem('currentDatabase');
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
        sessionStorage.setItem('currentDatabase', filename);

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
      sessionStorage.removeItem('currentDatabase');
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new App();
});
