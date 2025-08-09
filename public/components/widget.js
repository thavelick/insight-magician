export class WidgetComponent {
  constructor(id, onDelete, onSave, width = 2, height = 2) {
    this.id = id;
    this.onDelete = onDelete;
    this.onSave = onSave;
    this.isFlipped = false;
    this.query = "SELECT * FROM table_name LIMIT 10;";
    this.results = null;
    this.width = width; // 1 unit = half container width
    this.height = height; // 1 unit = half row height

    this.createElement();
  }

  createElement() {
    this.element = document.createElement("div");
    this.element.className = "widget";
    this.element.innerHTML = `
      <div class="widget-card">
        <div class="card-inner">
          <!-- Front of card (results view) -->
          <div class="card-front">
            <div class="widget-header">
              <h4>Query Results</h4>
              <div class="widget-controls">
                <button class="edit-btn" title="Edit Query">✏️ Edit</button>
                <button class="delete-btn" title="Delete Widget">🗑️</button>
              </div>
            </div>
            <div class="widget-content">
              <div class="results-container">
                <p class="no-results">Click "Edit" to write your SQL query, then "Run & View" to see results</p>
              </div>
            </div>
          </div>
          
          <!-- Back of card (query editor) -->
          <div class="card-back">
            <div class="widget-header">
              <h4>SQL Query Editor</h4>
              <div class="widget-controls">
                <button class="run-view-btn" title="Run Query & View Results">▶️ Run & View</button>
                <button class="delete-btn" title="Delete Widget">🗑️</button>
              </div>
            </div>
            <div class="widget-content">
              <textarea class="query-editor" placeholder="Enter your SQL query here...">${this.query}</textarea>
            </div>
          </div>
        </div>
        
        <!-- Visual size controls (outside the flipping card) -->
        <div class="visual-size-controls">
          <!-- Width controls on right edge -->
          <div class="width-controls">
            <button class="size-btn width-minus" title="Decrease width">−</button>
            <button class="size-btn width-plus" title="Increase width">+</button>
          </div>
          <!-- Height controls on bottom edge -->
          <div class="height-controls">
            <button class="size-btn height-minus" title="Decrease height">−</button>
            <button class="size-btn height-plus" title="Increase height">+</button>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.applySize();
  }

  setupEventListeners() {
    // Edit button (on results side)
    const editBtn = this.element.querySelector(".edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => this.flip());
    }

    // Delete buttons
    const deleteBtns = this.element.querySelectorAll(".delete-btn");
    for (const btn of deleteBtns) {
      btn.addEventListener("click", () => this.delete());
    }

    // Run & View button (on editor side)
    const runViewBtn = this.element.querySelector(".run-view-btn");
    if (runViewBtn) {
      runViewBtn.addEventListener("click", () => this.runQuery());
    }

    // Save query on textarea change (but don't persist yet)
    const textarea = this.element.querySelector(".query-editor");
    textarea.addEventListener("input", (e) => {
      this.query = e.target.value;
    });

    // Visual size control listeners
    const widthMinus = this.element.querySelector(".width-minus");
    const widthPlus = this.element.querySelector(".width-plus");
    const heightMinus = this.element.querySelector(".height-minus");
    const heightPlus = this.element.querySelector(".height-plus");

    if (widthMinus) {
      widthMinus.addEventListener("click", () => {
        if (this.width > 1) {
          this.width--;
          this.applySize();
          if (this.onSave) this.onSave();
        }
      });
    }

    if (widthPlus) {
      widthPlus.addEventListener("click", () => {
        if (this.width < 4) {
          this.width++;
          this.applySize();
          if (this.onSave) this.onSave();
        }
      });
    }

    if (heightMinus) {
      heightMinus.addEventListener("click", () => {
        if (this.height > 1) {
          this.height--;
          this.applySize();
          if (this.onSave) this.onSave();
        }
      });
    }

    if (heightPlus) {
      heightPlus.addEventListener("click", () => {
        if (this.height < 4) {
          this.height++;
          this.applySize();
          if (this.onSave) this.onSave();
        }
      });
    }
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    const cardInner = this.element.querySelector(".card-inner");

    if (this.isFlipped) {
      cardInner.classList.add("flipped");
    } else {
      cardInner.classList.remove("flipped");
    }
  }

  async runQuery() {
    const textarea = this.element.querySelector(".query-editor");
    const query = textarea.value.trim();

    if (!query) {
      this.showError("Please enter a SQL query");
      return;
    }

    this.showLoading();

    try {
      // TODO: Implement query execution API call
      console.log("Running query:", query);

      // Simulate query execution for now
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock results
      const mockResults = {
        columns: ["id", "name", "email"],
        rows: [
          [1, "John Doe", "john@example.com"],
          [2, "Jane Smith", "jane@example.com"],
          [3, "Bob Johnson", "bob@example.com"],
        ],
        totalRows: 3,
      };

      this.displayResults(mockResults);

      // Store results for persistence
      this.results = mockResults;

      // Flip to front to show results
      if (this.isFlipped) {
        this.flip();
      }

      // Save widget state after successful query
      if (this.onSave) {
        this.onSave();
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  showLoading() {
    const resultsContainer = this.element.querySelector(".results-container");
    resultsContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Running query...</p>
      </div>
    `;
  }

  showError(message) {
    const resultsContainer = this.element.querySelector(".results-container");
    resultsContainer.innerHTML = `
      <div class="error-state">
        <p>Error: ${message}</p>
      </div>
    `;
  }

  displayResults(results) {
    const resultsContainer = this.element.querySelector(".results-container");

    if (!results || !results.rows || results.rows.length === 0) {
      resultsContainer.innerHTML = '<p class="no-results">No results found</p>';
      return;
    }

    const tableHtml = `
      <div class="results-table-container">
        <table class="results-table">
          <thead>
            <tr>
              ${results.columns.map((col) => `<th>${col}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${results.rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td>${cell || ""}</td>`).join("")}
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        <div class="results-info">
          <p>Showing ${results.rows.length} of ${results.totalRows} rows</p>
        </div>
      </div>
    `;

    resultsContainer.innerHTML = tableHtml;
  }

  delete() {
    if (confirm("Are you sure you want to delete this widget?")) {
      this.element.remove();
      if (this.onDelete) {
        this.onDelete(this.id);
      }
    }
  }

  applySize() {
    this.element.style.gridColumn = `span ${this.width}`;
    this.element.style.gridRow = `span ${this.height}`;
    this.updateButtonVisibility();
  }

  updateButtonVisibility() {
    const widthMinus = this.element.querySelector(".width-minus");
    const widthPlus = this.element.querySelector(".width-plus");
    const heightMinus = this.element.querySelector(".height-minus");
    const heightPlus = this.element.querySelector(".height-plus");

    // Hide width buttons at limits
    if (widthMinus) {
      widthMinus.style.display = this.width <= 1 ? "none" : "flex";
    }
    if (widthPlus) {
      widthPlus.style.display = this.width >= 4 ? "none" : "flex";
    }

    // Hide height buttons at limits
    if (heightMinus) {
      heightMinus.style.display = this.height <= 1 ? "none" : "flex";
    }
    if (heightPlus) {
      heightPlus.style.display = this.height >= 4 ? "none" : "flex";
    }
  }

  getElement() {
    return this.element;
  }

  // Serialization methods for persistence
  serialize() {
    return {
      id: this.id,
      query: this.query,
      isFlipped: this.isFlipped,
      results: this.results,
      width: this.width,
      height: this.height,
    };
  }

  static deserialize(data, onDelete, onSave) {
    const widget = new WidgetComponent(
      data.id,
      onDelete,
      onSave,
      data.width || 2,
      data.height || 2,
    );
    widget.query = data.query || "SELECT * FROM table_name LIMIT 10;";
    widget.results = data.results || null;

    // Update the textarea with saved query
    const textarea = widget.element.querySelector(".query-editor");
    if (textarea) {
      textarea.value = widget.query;
    }

    // Restore results if available
    if (widget.results) {
      widget.displayResults(widget.results);
    }

    // Restore flip state
    if (data.isFlipped) {
      setTimeout(() => widget.flip(), 50);
    }

    return widget;
  }
}
