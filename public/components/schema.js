export class SchemaComponent {
  constructor() {
    this.createSidebar();
  }

  createSidebar() {
    // Create schema sidebar
    this.sidebar = document.createElement("div");
    this.sidebar.className = "schema-sidebar";
    this.sidebar.innerHTML = `
      <div class="schema-header">
        <h3>Database Schema</h3>
        <button class="close-schema">×</button>
      </div>
      <div class="schema-content">
        <!-- Schema will be populated here -->
      </div>
    `;

    // Add close functionality
    this.sidebar
      .querySelector(".close-schema")
      .addEventListener("click", () => {
        this.hide();
      });

    document.body.appendChild(this.sidebar);
  }

  displaySchema(schema) {
    const content = this.sidebar.querySelector(".schema-content");

    if (!schema || Object.keys(schema).length === 0) {
      content.innerHTML =
        '<p class="no-tables">No tables found in database</p>';
      return;
    }

    let html = "";

    for (const [tableName, tableInfo] of Object.entries(schema)) {
      html += `
        <div class="table-info">
          <div class="table-header">
            <h4>${tableName}</h4>
            <span class="row-count">${tableInfo.rowCount.toLocaleString()} rows</span>
          </div>
          <div class="columns">
            ${tableInfo.columns
              .map(
                (col) => `
              <div class="column">
                <span class="column-name">${col.name}</span>
                <span class="column-type">${col.type}</span>
                ${col.primaryKey ? '<span class="pk-badge">PK</span>' : ""}
                ${!col.nullable ? '<span class="nn-badge">NOT NULL</span>' : ""}
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  show() {
    this.sidebar.classList.add("visible");
  }

  hide() {
    this.sidebar.classList.remove("visible");
  }
}
