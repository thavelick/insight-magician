# 🔍 Insight Magician

A simple database query dashboard that allows you to upload SQLite databases and create custom query widgets. Each widget shows the results of a SQL query with built-in pagination, and widgets can be flipped between edit mode (SQL query) and view mode (results).

## Features

- **SQLite File Upload**: Drag & drop database file upload with validation
- **Schema Browser**: View available tables and columns for reference  
- **Flip Card Widgets**: Each widget has two sides - query editor (back) and results table (front)
- **Graph Widgets**: Create D3.js visualizations with custom JavaScript functions
- **AI Chat Assistant**: Interactive chat sidebar for database analysis help (Phase 1: echo functionality)
- **Widget Management**: Add new widgets via button in top-right corner
- **Pagination**: Automatic LIMIT/OFFSET handling with page navigation
- **Query Persistence**: Remembers pagination state unless query changes

## Graph Widget Examples

Create visualizations by selecting "Graph" widget type and writing JavaScript functions that use D3.js:

### Simple Bar Chart

**SQL Query:**
```sql
SELECT category, count FROM sales
```

**JavaScript Function:**
```javascript
function createChart(data, svg, d3, width, height) {
  svg.selectAll('rect')
    .data(data)
    .enter().append('rect')
    .attr('x', (d, i) => i * 50)
    .attr('y', d => height - d.count * 5)
    .attr('width', 40)
    .attr('height', d => d.count * 5)
    .attr('fill', 'steelblue');
    
  return svg;
}
```
📖 [See detailed bar chart example →](examples/simple-bar-chart.md)

### Simple Pie Chart

**SQL Query:**
```sql
SELECT name, value FROM products
```

**JavaScript Function:**
```javascript
function createChart(data, svg, d3, width, height) {
  const radius = Math.min(width, height) / 2 - 20;
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  
  svg.append('g')
    .attr('transform', `translate(${width/2}, ${height/2})`)
    .selectAll('path')
    .data(pie(data))
    .enter().append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => d3.schemeCategory10[i]);
    
  return svg;
}
```
📖 [See detailed pie chart example →](examples/simple-pie-chart.md)

> **Note**: Your function receives `(data, svg, d3, width, height)` parameters. Data is an array of objects from your SQL query. 
> 
> 🗂️ **[Browse all examples →](examples/)** including interactive charts, line charts, and sample database

## Development Status

**✅ Complete - Core Application**
- SQLite file upload and schema introspection
- Interactive flip card widgets with query editor
- D3.js graph widgets with custom JavaScript functions
- Comprehensive testing suite (unit + integration)
- Production-ready foundation

**✅ Phase 1 & 1.5 Complete - AI Chat Assistant**
- Left sidebar chat interface with mobile responsiveness
- Message persistence using sessionStorage  
- Business logic extraction with 88 unit tests
- Echo functionality (Phase 1 placeholder)
- Clean architecture with separated concerns

**🚧 Phase 2 - AI Integration**
- OpenRouter + OpenAI SDK integration
- Real AI responses for database analysis
- Context-aware chat with database schema knowledge

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) - JavaScript runtime and toolkit

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd insight-magician

# Install dependencies
make install
```

### Development

```bash
# Start development server (http://localhost:3000)
make dev

# Format code
make format

# Lint code
make lint

# Run unit tests
make test-unit

# Run integration tests
make test-integration

# Run all tests
make test-all
```

## Architecture

### Backend
- **Runtime**: Bun with built-in SQLite support
- **Server**: Bun.serve() with REST API endpoints
- **Database**: bun:sqlite for SQLite file operations

### Frontend
- **Framework**: Vanilla JavaScript with Bun's bundling
- **Styling**: CSS with Flexbox and flip card animations
- **UI Components**: Custom flip card widgets with pagination
- **Chat Interface**: Left sidebar with mobile responsiveness

### API Endpoints

- `POST /api/upload` - Upload SQLite database file
- `GET /api/schema` - Get database schema (tables, columns)  
- `POST /api/query` - Execute SQL query with pagination
- `POST /api/chat` - AI chat assistant (Phase 2)

## User Flow

1. **Upload**: User drags SQLite file to upload area
2. **Schema**: System shows database schema (tables/columns) in right sidebar
3. **Chat**: AI chat assistant available in left sidebar for analysis help
4. **Add Widget**: User clicks "Add Widget" button (top-right)
5. **Edit Query**: Widget starts in edit mode (back of card) with SQL textarea
6. **Execute**: User writes SQL query and clicks "Run" to flip to results (front of card)
7. **Browse Results**: Front shows paginated table with prev/next navigation
8. **Edit Again**: User can flip back to query editor to modify SQL

## Tech Stack

- **Bun** - Runtime and package manager
- **Biome** - Code formatting and linting
- **Playwright** - Integration testing
- **SQLite** - Database file support
- **Vanilla JS/CSS** - Frontend without framework dependencies

## Contributing

This project uses:
- Biome for consistent code formatting
- Conventional commit messages
- Test-driven development approach
- GitHub Actions for CI/CD

Run `make help` to see all available commands.

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.