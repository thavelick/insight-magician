export class UploadComponent {
  constructor(onUploadCallback) {
    this.onUpload = onUploadCallback;
    this.uploadArea = document.querySelector(".upload-area");
    this.init();
  }

  init() {
    if (!this.uploadArea) return;

    // Create file input
    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".db,.sqlite,.sqlite3";
    this.fileInput.style.display = "none";
    document.body.appendChild(this.fileInput);

    // Add event listeners
    this.uploadArea.addEventListener("click", () => this.fileInput.click());
    this.uploadArea.addEventListener(
      "dragover",
      this.handleDragOver.bind(this),
    );
    this.uploadArea.addEventListener("drop", this.handleDrop.bind(this));
    this.fileInput.addEventListener("change", this.handleFileSelect.bind(this));
  }

  handleDragOver(e) {
    e.preventDefault();
    this.uploadArea.classList.add("drag-over");
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadArea.classList.remove("drag-over");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  handleFileSelect(e) {
    if (e.target.files.length > 0) {
      this.uploadFile(e.target.files[0]);
    }
  }

  async uploadFile(file) {
    this.showLoading();

    const formData = new FormData();
    formData.append("database", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        this.onUpload(result.filename);
      } else {
        this.showError(result.error);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      this.showError("Upload failed. Please try again.");
    }
  }

  showLoading() {
    this.uploadArea.innerHTML = `
      <div class="upload-status loading">
        <div class="spinner"></div>
        <p>Uploading database...</p>
      </div>
    `;
  }

  showSuccess(message) {
    this.uploadArea.innerHTML = `
      <div class="upload-status success">
        <div class="success-icon">✓</div>
        <p>${message}</p>
        <button class="upload-another">Upload Another Database</button>
      </div>
    `;

    // Add click handler for upload another
    this.uploadArea
      .querySelector(".upload-another")
      .addEventListener("click", () => {
        this.reset();
      });
  }

  showError(message) {
    this.uploadArea.innerHTML = `
      <div class="upload-status error">
        <div class="error-icon">✕</div>
        <p>${message}</p>
        <button class="try-again">Try Again</button>
      </div>
    `;

    // Add click handler for try again
    this.uploadArea
      .querySelector(".try-again")
      .addEventListener("click", () => {
        this.reset();
      });
  }

  reset() {
    this.uploadArea.innerHTML = `
      <p>Drop your SQLite database file here</p>
      <p><small>Or click to select a file</small></p>
    `;
  }
}
