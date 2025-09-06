import * as d3 from "d3";
import { humanizeField } from "../../lib/humanizer.js";

import { logger } from "../lib/logger.js";
export class WidgetComponent {
  constructor(
    id,
    onDelete,
    onSave,
    width = 2,
    height = 2,
    currentDatabase = null,
    title = "",
    widgetType = "data-table",
  ) {
    this.id = id;
    this.onDelete = onDelete;
    this.onSave = onSave;
    this.currentDatabase = currentDatabase;
    this.isFlipped = false;
    this.query = "";
    this.results = null;
    this.width = width; // 1 unit = half container width
    this.height = height; // 1 unit = half row height
    this.currentPage = 1;
    this.pageSize = 50;
    this.title = title;
    this.widgetType = widgetType;
    this.chartFunction = "";

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
              <p class="no-results">Click "Edit" to add your SQL query, then "Run & View" to see results</p>
            </div>
          </div>
          
          <!-- Back of card (query editor) -->
          <div class="card-back">
            <div class="widget-header">
              <h4 class="back-panel-title">Widget Settings</h4>
              <div class="widget-controls">
                <button class="run-view-btn" title="Run Query & View Results">▶️ Run & View</button>
                <button class="delete-btn" title="Delete Widget">🗑️</button>
              </div>
            </div>
            <div class="widget-content">
              <div class="form-group">
                <label for="widget-title-${this.id}">Widget Title:</label>
                <input type="text" id="widget-title-${this.id}" class="widget-title-input" value="${this.title}" placeholder="Enter widget title (optional)">
              </div>
              <div class="form-group">
                <label for="widget-type-${this.id}">Widget Type:</label>
                <select id="widget-type-${this.id}" class="widget-type-select">
                  <option value="data-table" ${this.widgetType === "data-table" ? "selected" : ""}>Data Table</option>
                  <option value="graph" ${this.widgetType === "graph" ? "selected" : ""}>Graph</option>
                </select>
              </div>
              <div class="form-group">
                <label for="query-editor-${this.id}">SQL Query:</label>
                <textarea id="query-editor-${this.id}" class="query-editor" placeholder="SELECT * FROM table_name WHERE condition = 'value';">${this.query}</textarea>
              </div>
              <div class="form-group chart-function-group" style="display: none;">
                <label for="chart-function-${this.id}">JavaScript Chart Function:</label>
                <textarea id="chart-function-${this.id}" class="chart-function-editor" placeholder="function createChart(data, svg, d3, width, height) {
  // Your function receives:
  // - data: array of objects from your SQL query
  // - svg: pre-configured D3 selection with viewBox set
  // - d3: D3.js library
  // - width: 400 (chart width in pixels)
  // - height: 300 (chart height in pixels)

  // Example:
  const radius = Math.min(width, height) / 2 - 20;
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  svg.append('circle')
    .attr('cx', width / 2)
    .attr('cy', height / 2)
    .attr('r', radius)
    .attr('fill', color(0));
    
  return svg;
}">${this.chartFunction}</textarea>
              </div>
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
    this.updateWidgetHeader();
    this.updateChartFunctionVisibility();
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

    // Save query on textarea change (but don't validate while typing)
    const textarea = this.element.querySelector(".query-editor");
    textarea.addEventListener("input", (e) => {
      this.query = e.target.value;
    });

    // Widget title input change handler
    const titleInput = this.element.querySelector(".widget-title-input");
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        this.title = e.target.value;
        this.updateWidgetHeader();
        if (this.onSave) this.onSave();
      });
    }

    // Widget type select change handler
    const typeSelect = this.element.querySelector(".widget-type-select");
    if (typeSelect) {
      typeSelect.addEventListener("change", (e) => {
        const newType = e.target.value;
        const oldType = this.widgetType;

        // Check if switching from graph to table with existing chart function
        if (
          oldType === "graph" &&
          newType === "data-table" &&
          this.chartFunction.trim()
        ) {
          const confirmSwitch = confirm(
            "Switching to Data Table will remove your chart function code. Are you sure?",
          );

          if (!confirmSwitch) {
            // Revert the selection
            e.target.value = oldType;
            return;
          }
          // Clear chart function if user confirms
          this.chartFunction = "";
          const chartFunctionTextarea = this.element.querySelector(
            ".chart-function-editor",
          );
          if (chartFunctionTextarea) {
            chartFunctionTextarea.value = "";
          }
        }

        this.widgetType = newType;
        this.updateChartFunctionVisibility();
        if (this.onSave) this.onSave();
      });
    }

    // Chart function textarea change handler
    const chartFunctionTextarea = this.element.querySelector(
      ".chart-function-editor",
    );
    if (chartFunctionTextarea) {
      chartFunctionTextarea.addEventListener("input", (e) => {
        this.chartFunction = e.target.value;
        if (this.onSave) this.onSave();
      });
    }

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
          this.showSizeFeedback(`${this.width}×${this.height}`);
          if (this.onSave) this.onSave();
        }
      });
    }

    if (widthPlus) {
      widthPlus.addEventListener("click", () => {
        if (this.width < 4) {
          this.width++;
          this.applySize();
          this.showSizeFeedback(`${this.width}×${this.height}`);
          if (this.onSave) this.onSave();
        }
      });
    }

    if (heightMinus) {
      heightMinus.addEventListener("click", () => {
        if (this.height > 1) {
          this.height--;
          this.applySize();
          this.showSizeFeedback(`${this.width}×${this.height}`);
          if (this.onSave) this.onSave();
        }
      });
    }

    if (heightPlus) {
      heightPlus.addEventListener("click", () => {
        if (this.height < 4) {
          this.height++;
          this.applySize();
          this.showSizeFeedback(`${this.width}×${this.height}`);
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

  updateWidgetHeader() {
    const frontHeader = this.element.querySelector(
      ".card-front .widget-header h4",
    );
    if (frontHeader) {
      if (this.title.trim()) {
        frontHeader.textContent = this.title;
      } else {
        frontHeader.textContent = "Query Results";
      }
    }

    const backHeader = this.element.querySelector(
      ".card-back .back-panel-title",
    );
    if (backHeader) {
      if (this.title.trim()) {
        backHeader.textContent = `${this.title} Widget Settings`;
      } else {
        backHeader.textContent = "Widget Settings";
      }
    }
  }

  updateChartFunctionVisibility() {
    const chartFunctionGroup = this.element.querySelector(
      ".chart-function-group",
    );
    if (chartFunctionGroup) {
      chartFunctionGroup.style.display =
        this.widgetType === "graph" ? "block" : "none";
    }
  }

  async runQuery() {
    const textarea = this.element.querySelector(".query-editor");
    const query = textarea.value.trim();

    if (!query) {
      this.showError("Please enter a SQL query");
      return;
    }

    // Validate query before execution
    const validation = this.validateSql(query);
    if (!validation.isValid) {
      this.showError(validation.error);
      return;
    }

    // Validate chart function if widget type is graph
    if (this.widgetType === "graph") {
      if (!this.chartFunction.trim()) {
        this.showError("Chart function is required for graph widgets");
        return;
      }

      const chartValidation = this.validateChartFunction(this.chartFunction);
      if (!chartValidation.isValid) {
        this.showError(chartValidation.error);
        return;
      }
    }

    if (!this.currentDatabase) {
      this.showError("No database loaded");
      return;
    }

    this.showLoading();

    try {
      // Call the query API
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: this.currentDatabase,
          query: query,
          page: this.currentPage,
          pageSize: this.pageSize,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.clearError();

        this.displayResults(result);

        // Store results for persistence
        this.results = result;

        // Flip to front to show results
        if (this.isFlipped) {
          this.flip();
        }

        // Save widget state after successful query
        if (this.onSave) {
          this.onSave();
        }
      } else {
        // Handle error responses (4xx, 5xx status codes or success: false)
        const errorMessage = result.error || "Query execution failed";
        this.showError(errorMessage);
      }
    } catch (error) {
      logger.error("Query execution error:", error);
      this.showError("Failed to execute query. Please check your connection.");
    }
  }

  showLoading() {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );
    widgetContent.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Running query...</p>
      </div>
    `;
  }

  showGraphLoading() {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );
    widgetContent.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Executing chart function...</p>
      </div>
    `;
  }

  showGraphError(error, results) {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );

    const fallbackDisplay = this.createFallbackDisplay(results);

    widgetContent.innerHTML = `
      <div class="error-state">
        <div class="error-header">
          <h5>⚠️ Chart Error</h5>
          <p class="error-message">${error.message}</p>
        </div>
        
        <details class="error-details">
          <summary>Show Technical Details</summary>
          <div class="error-details-content">
            <p><strong>Error Type:</strong> ${error.name || "Error"}</p>
            ${error.stack ? `<pre>${error.stack}</pre>` : ""}
          </div>
        </details>
        
        <div class="data-preview-section">
          <h6>📊 Data Preview</h6>
          ${fallbackDisplay}
        </div>
        
        <div class="help-section">
          <p>💡 Tips:</p>
          <ul>
            <li>Make sure your function returns an SVG or DOM element</li>
            <li>Use <code>svg.node()</code> to return from D3 selections</li>
            <li>Check the browser console for additional details</li>
            <li>Verify your data has the expected column names</li>
          </ul>
        </div>
      </div>
    `;
  }

  createFallbackDisplay(results) {
    if (!results || !results.rows || results.rows.length === 0) {
      return '<p class="no-data">No data to display</p>';
    }

    // Show a simple preview table with limited rows
    const maxRows = Math.min(5, results.rows.length);
    const previewRows = results.rows.slice(0, maxRows);

    const tableHtml = `
      <div class="data-preview-container">
        <table class="data-preview-table">
          <thead>
            <tr>
              ${results.columns.map((col) => `<th>${col}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${previewRows
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
      </div>
      ${results.rows.length > maxRows ? `<p class="data-preview-row-count">Showing ${maxRows} of ${results.rows.length} rows</p>` : ""}
    `;

    return tableHtml;
  }

  showError(message) {
    // Show error on the current visible side
    if (this.isFlipped) {
      // We're on the editor side (back), show error in the editor area
      const editorContainer = this.element.querySelector(
        ".card-back .widget-content",
      );
      const queryFormGroup = editorContainer.querySelector(
        ".form-group:last-child",
      ); // The SQL query form group

      // Add error message above the query form group
      const existingError = editorContainer.querySelector(".error-message");
      if (existingError) existingError.remove();

      const errorDiv = document.createElement("div");
      errorDiv.className = "error-message";
      errorDiv.innerHTML = `<p style="color: red; margin: 10px 0; padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px;">Error: ${message}</p>`;

      if (queryFormGroup) {
        editorContainer.insertBefore(errorDiv, queryFormGroup);
      } else {
        // Fallback: just append to the container
        editorContainer.appendChild(errorDiv);
      }
    } else {
      // We're on the results side (front), show error in widget content
      const widgetContent = this.element.querySelector(
        ".card-front .widget-content",
      );
      widgetContent.innerHTML = `
        <div class="error-state">
          <p>Error: ${message}</p>
        </div>
      `;
    }
  }

  displayResults(results) {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );

    if (!results || !results.rows || results.rows.length === 0) {
      widgetContent.innerHTML = '<p class="no-results">No results found</p>';
      return;
    }

    // Handle graph widgets differently
    if (this.widgetType === "graph") {
      this.displayGraph(results);
    } else {
      this.displayDataTable(results);
    }
  }

  displayDataTable(results) {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );

    const tableHtml = `
      <table class="results-table">
        <thead>
          <tr>
            ${results.columns.map((col) => `<th>${humanizeField(col)}</th>`).join("")}
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
        <p>Showing ${results.rows.length} of ${results.totalRows} rows (Page ${results.page} of ${results.totalPages})</p>
        ${results.totalPages > 1 ? this.createPaginationControls(results) : ""}
      </div>
    `;

    widgetContent.innerHTML = tableHtml;

    // Set up pagination event listeners
    this.setupPaginationListeners();
  }

  displayGraph(results) {
    const widgetContent = this.element.querySelector(
      ".card-front .widget-content",
    );

    // Show loading state for graph execution
    this.showGraphLoading();

    // Use setTimeout to yield to browser and show loading state
    setTimeout(() => {
      try {
        // Transform data from columns/rows format to array of objects
        const transformedData = this.transformDataForGraph(results);

        // Execute the user's chart function safely
        const chartElement = this.executeChartFunction(transformedData);

        // Clear existing content and add the chart
        widgetContent.innerHTML = '<div class="chart-container"></div>';
        const chartContainer = widgetContent.querySelector(".chart-container");
        chartContainer.appendChild(chartElement);

        // Add results info for graphs too
        const resultsInfo = document.createElement("div");
        resultsInfo.className = "results-info";
        resultsInfo.innerHTML = `<p>Chart showing ${results.rows.length} data points</p>`;
        widgetContent.appendChild(resultsInfo);
      } catch (error) {
        logger.error("Chart rendering error:", error);
        this.showGraphError(error, results);
      }
    }, 100);
  }

  /**
   * Transform SQL results from columns/rows format to array of objects
   * @param {object} results - SQL results with columns and rows arrays
   * @returns {array} Array of objects suitable for D3.js
   */
  transformDataForGraph(results) {
    const { columns, rows } = results;

    return rows.map((row) => {
      const obj = {};
      columns.forEach((column, index) => {
        obj[column] = row[index];
      });
      return obj;
    });
  }

  /**
   * Execute the user's chart function safely
   * @param {array} data - Transformed data array
   * @returns {HTMLElement} DOM element returned by chart function
   */
  executeChartFunction(data) {
    // Validate that we have a chart function
    if (!this.chartFunction || !this.chartFunction.trim()) {
      throw new Error("No chart function defined");
    }

    // Set up chart dimensions and create pre-configured SVG
    const width = 400;
    const height = 300;

    // Create properly namespaced SVG with D3 (responsive sizing via CSS)
    const svg = d3
      .select(document.createElementNS("http://www.w3.org/2000/svg", "svg"))
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Create the function from the user's code
    let userFunction;
    try {
      userFunction = new Function(
        "data",
        "svg",
        "d3",
        "width",
        "height",
        `
        // Execute user code - user should define complete function
        return (${this.chartFunction})(data, svg, d3, width, height);
      `,
      );
    } catch (error) {
      throw new Error(`Chart function compilation error: ${error.message}`);
    }

    // Execute the function with basic error handling
    let result;
    try {
      result = userFunction(data, svg, d3, width, height);
    } catch (error) {
      throw new Error(`Chart function execution error: ${error.message}`);
    }

    // Validate the return value
    if (!this.isValidChartElement(result)) {
      throw new Error(
        "Chart function must return a DOM element or D3 selection",
      );
    }

    // Handle D3 selection vs DOM element
    if (result && typeof result.node === "function") {
      return result.node(); // D3 selection
    }
    return result; // DOM element
  }

  /**
   * Validate that the chart function returned a valid DOM element
   * @param {any} element - Return value from chart function
   * @returns {boolean} True if valid DOM element or D3 selection
   */
  isValidChartElement(element) {
    // Check if it's a DOM element
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      return true;
    }

    // Check if it's a D3 selection with a node() method
    if (element && typeof element.node === "function") {
      const node = element.node();
      return node instanceof HTMLElement || node instanceof SVGElement;
    }

    return false;
  }

  createPaginationControls(results) {
    const { page, totalPages } = results;
    const prevDisabled = page <= 1 ? "disabled" : "";
    const nextDisabled = page >= totalPages ? "disabled" : "";

    return `
      <div class="pagination-controls">
        <button class="pagination-btn prev-btn" ${prevDisabled}>← Previous</button>
        <span class="page-info">Page ${page} of ${totalPages}</span>
        <button class="pagination-btn next-btn" ${nextDisabled}>Next →</button>
      </div>
    `;
  }

  setupPaginationListeners() {
    const prevBtn = this.element.querySelector(".prev-btn");
    const nextBtn = this.element.querySelector(".next-btn");

    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener("click", () => {
        this.currentPage--;
        this.runQuery();
      });
    }

    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener("click", () => {
        this.currentPage++;
        this.runQuery();
      });
    }
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

  /**
   * Update form field values to match current widget properties
   * Useful when properties are set after widget creation (e.g., from AI tools)
   */
  updateFormFields() {
    // Update title input field
    const titleInput = this.element?.querySelector(".widget-title-input");
    if (titleInput) {
      titleInput.value = this.title;
    }

    // Update widget type dropdown
    const typeSelect = this.element?.querySelector(".widget-type-select");
    if (typeSelect) {
      typeSelect.value = this.widgetType;
    }

    // Update query textarea
    const queryTextarea = this.element?.querySelector(".query-editor");
    if (queryTextarea) {
      queryTextarea.value = this.query;
    }

    // Update chart function textarea
    const chartFunctionTextarea = this.element?.querySelector(
      ".chart-function-editor",
    );
    if (chartFunctionTextarea) {
      chartFunctionTextarea.value = this.chartFunction;
    }

    // Update header titles to reflect the current title
    this.updateWidgetHeader();

    // Show/hide chart function based on widget type
    this.updateChartFunctionVisibility();

    // Update visual size if dimensions changed
    this.applySize();
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
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      title: this.title,
      widgetType: this.widgetType,
      chartFunction: this.chartFunction,
    };
  }

  static deserialize(data, onDelete, onSave, currentDatabase = null) {
    const widget = new WidgetComponent(
      data.id,
      onDelete,
      onSave,
      data.width || 2,
      data.height || 2,
      currentDatabase,
      data.title || "",
      data.widgetType || "data-table",
    );
    widget.query = data.query || "";
    widget.results = data.results || null;
    widget.currentPage = data.currentPage || 1;
    widget.pageSize = data.pageSize || 50;
    widget.chartFunction = data.chartFunction || "";

    // Update the textarea with saved query
    const textarea = widget.element.querySelector(".query-editor");
    if (textarea) {
      textarea.value = widget.query;
    }

    // Update the chart function textarea with saved function
    const chartFunctionTextarea = widget.element.querySelector(
      ".chart-function-editor",
    );
    if (chartFunctionTextarea) {
      chartFunctionTextarea.value = widget.chartFunction;
    }

    // Update chart function visibility after setting widget type
    widget.updateChartFunctionVisibility();

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

  /**
   * Client-side SQL validation (mirrors server-side validation)
   * @param {string} query - The SQL query to validate
   * @returns {object} - { isValid: boolean, error?: string }
   */
  validateSql(query) {
    if (!query || typeof query !== "string") {
      return { isValid: false, error: "Query must be a non-empty string" };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { isValid: false, error: "Query cannot be empty" };
    }

    const queryLower = trimmedQuery.toLowerCase();

    // Check for semicolons (prevent multiple statements)
    if (query.includes(";")) {
      return {
        isValid: false,
        error:
          "Semicolons are not allowed. Please write a single SQL statement.",
      };
    }

    // Check for dangerous operations
    const dangerousKeywords = [
      "drop",
      "delete",
      "update",
      "insert",
      "alter",
      "create",
      "truncate",
      "replace",
      "pragma",
    ];

    for (const keyword of dangerousKeywords) {
      if (queryLower.startsWith(keyword)) {
        return {
          isValid: false,
          error: `${keyword.toUpperCase()} operations are not allowed. Only SELECT queries permitted.`,
        };
      }
    }

    // Check for forbidden keywords that interfere with pagination
    const forbiddenKeywords = ["limit", "offset"];
    for (const keyword of forbiddenKeywords) {
      if (
        queryLower.includes(` ${keyword} `) ||
        queryLower.includes(` ${keyword}(`)
      ) {
        return {
          isValid: false,
          error: `${keyword.toUpperCase()} clauses are not allowed. We handle pagination automatically.`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate JavaScript chart function syntax
   * @param {string} functionCode - The JavaScript function code to validate
   * @returns {object} - { isValid: boolean, error?: string }
   */
  validateChartFunction(functionCode) {
    if (!functionCode || typeof functionCode !== "string") {
      return {
        isValid: false,
        error: "Chart function must be a non-empty string",
      };
    }

    const trimmedCode = functionCode.trim();
    if (!trimmedCode) {
      return { isValid: false, error: "Chart function cannot be empty" };
    }

    // Check for dangerous loop constructs that could cause infinite loops
    const dangerousPatterns = [
      {
        pattern: /while\s*\(/,
        message: "while loops are not allowed due to infinite loop risk",
      },
      {
        pattern: /for\s*\(.*;;.*\)/,
        message: "infinite for loops (for(;;)) are not allowed",
      },
      {
        pattern: /do\s*\{[\s\S]*\}\s*while\s*\(/,
        message: "do-while loops are not allowed due to infinite loop risk",
      },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(trimmedCode)) {
        return {
          isValid: false,
          error: `Dangerous code detected: ${message}`,
        };
      }
    }

    try {
      // Basic syntax validation using Function constructor
      new Function(trimmedCode);
      return { isValid: true };
    } catch (error) {
      let errorMessage = error.message;

      // Add line and column info if available
      if (error.lineNumber && error.columnNumber) {
        errorMessage = `Line ${error.lineNumber}, Column ${error.columnNumber}: ${errorMessage}`;
      } else if (error.lineNumber) {
        errorMessage = `Line ${error.lineNumber}: ${errorMessage}`;
      }

      return {
        isValid: false,
        error: `JavaScript syntax error: ${errorMessage}`,
      };
    }
  }

  /**
   * Clear any error messages from both sides of the widget
   */
  clearError() {
    // Clear error from editor side (back of card)
    const editorContainer = this.element.querySelector(
      ".card-back .widget-content",
    );
    if (editorContainer) {
      const existingError = editorContainer.querySelector(".error-message");
      if (existingError) {
        existingError.remove();
      }
    }

    // Note: Front side errors are automatically cleared when displayResults()
    // or showLoading() updates the content, so no explicit clearing needed there
  }

  /**
   * Show animated size feedback when size changes
   * @param {string} sizeText - The size text to display (e.g., "2×1")
   */
  showSizeFeedback(sizeText) {
    // Remove any existing feedback
    const existingFeedback = this.element.querySelector(".size-feedback");
    if (existingFeedback) {
      existingFeedback.remove();
    }

    // Create new feedback element
    const feedback = document.createElement("div");
    feedback.className = "size-feedback";
    feedback.textContent = sizeText;

    // Add to the widget (positioned relative to widget center)
    this.element.style.position = "relative";
    this.element.appendChild(feedback);

    // Trigger animation by adding the animate class
    requestAnimationFrame(() => {
      feedback.classList.add("animate");

      // Clean up after animation completes
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.remove();
        }
      }, 1200);
    });
  }
}
