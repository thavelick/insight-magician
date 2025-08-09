# 🔍 Insight Magician

A simple database query dashboard that allows you to upload SQLite databases and create custom query widgets. Each widget shows the results of a SQL query with built-in pagination, and widgets can be flipped between edit mode (SQL query) and view mode (results).

## Features

- **SQLite File Upload**: Drag & drop database file upload with validation
- **Schema Browser**: View available tables and columns for reference  
- **Flip Card Widgets**: Each widget has two sides - query editor (back) and results table (front)
- **Widget Management**: Add new widgets via button in top-right corner
- **Pagination**: Automatic LIMIT/OFFSET handling with page navigation
- **Query Persistence**: Remembers pagination state unless query changes

## Development Status

**✅ Phase 1 Complete - Development Environment**
- Biome for code formatting and linting
- Makefile with dev, format, lint, test commands
- GitHub Actions CI/CD pipeline
- Unit and integration test structure
- Basic server and frontend foundation

**🚧 Next Up - Phase 2: Foundation**
- SQLite file handling and schema introspection
- Upload interface and schema sidebar
- Basic API endpoints implementation

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

### API Endpoints

- `POST /api/upload` - Upload SQLite database file
- `GET /api/schema` - Get database schema (tables, columns)  
- `POST /api/query` - Execute SQL query with pagination

## User Flow

1. **Upload**: User drags SQLite file to upload area
2. **Schema**: System shows database schema (tables/columns) in sidebar
3. **Add Widget**: User clicks "Add Widget" button (top-right)
4. **Edit Query**: Widget starts in edit mode (back of card) with SQL textarea
5. **Execute**: User writes SQL query and clicks "Run" to flip to results (front of card)
6. **Browse Results**: Front shows paginated table with prev/next navigation
7. **Edit Again**: User can flip back to query editor to modify SQL

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