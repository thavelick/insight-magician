# Insight Magician - Project Plan

## Project Vision

**Insight Magician** is a simple database query dashboard that allows users to upload SQLite databases and create custom query widgets. Each widget shows the results of a SQL query with built-in pagination, and widgets can be flipped between edit mode (SQL query) and view mode (results).

## Core Features

### Core Features
- **SQLite File Upload**: Drag & drop database file upload with validation
- **Schema Browser**: View available tables and columns for reference
- **Flip Card Widgets**: Each widget has two sides - query editor (back) and results table (front)
- **Widget Management**: Add new widgets via button in top-right corner
- **Pagination**: Automatic LIMIT/OFFSET handling with page navigation
- **Query Persistence**: Remembers pagination state unless query changes

### Future Enhancements
- **Multi-Database Support**: PostgreSQL and MySQL connections
- **Export Capabilities**: CSV export for query results
- **Dashboard Layouts**: Save and organize widget arrangements

## User Flow

1. **Upload**: User drags SQLite file to upload area
2. **Schema**: System shows database schema (tables/columns) in sidebar
3. **Add Widget**: User clicks "Add Widget" button (top-right)
4. **Edit Query**: Widget starts in edit mode (back of card) with SQL textarea
5. **Execute**: User writes SQL query and clicks "Run" to flip to results (front of card)
6. **Browse Results**: Front shows paginated table with prev/next navigation
7. **Edit Again**: User can flip back to query editor to modify SQL

## Technical Architecture

### Backend Stack
- **Runtime**: Bun (fast JavaScript runtime)
- **Server**: Bun.serve() with REST API endpoints
- **Database**: bun:sqlite for SQLite file operations
- **File Handling**: Bun.file() for secure upload processing

### API Endpoints
- `POST /api/upload` - Upload SQLite database file
- `GET /api/schema` - Get database schema (tables, columns)
- `POST /api/query` - Execute SQL query with pagination

### Frontend Stack
- **Framework**: Vanilla JavaScript (no React/Vue dependencies)
- **Bundling**: Bun's built-in bundler via HTML imports
- **Styling**: CSS with Flexbox and CSS animations for flip cards
- **UI Components**: Custom flip card widgets with pagination

### Data Flow
```
[Upload] → [Schema Discovery] → [Add Widget] → [SQL Query] → [Execute & Paginate] → [Results Display]
```

## Widget System

### Flip Card Architecture
```javascript
class QueryWidget {
  constructor(id) {
    this.id = id;
    this.query = '';
    this.currentPage = 1;
    this.pageSize = 25;
    this.isFlipped = false; // false = results (front), true = editor (back)
    this.lastQueryHash = null; // reset pagination when query changes
  }
  
  async executeQuery() {
    const offset = (this.currentPage - 1) * this.pageSize;
    const paginatedQuery = this.addPagination(this.query, this.pageSize, offset);
    const results = await db.executeQuery(paginatedQuery);
    return results;
  }
  
  addPagination(query, limit, offset) {
    // Wrap user query and add LIMIT/OFFSET
    return `SELECT * FROM (${query}) LIMIT ${limit} OFFSET ${offset}`;
  }
}
```

### Security Measures
- **Prepared Statements**: Never allow SQL injection
- **Query Validation**: Parse and validate all generated SQL
- **File Limits**: 100MB max upload size, SQLite format validation
- **Temporary Storage**: Auto-cleanup old uploads

## Database Management

### SQLite Operations
```javascript
class DatabaseManager {
  constructor(filePath) {
    this.db = new Bun.SQLiteDatabase(filePath);
  }
  
  async getSchema() {
    // Get tables: PRAGMA table_list
    // Get columns: PRAGMA table_info(table_name) 
    // Return structured schema for sidebar display
  }
  
  async executeQuery(sql) {
    // Validate query (SELECT only)
    // Execute with timeout protection
    // Return results with column info
  }
}
```

## UI Components

### Flip Card Widget
```css
.widget-card {
  perspective: 1000px;
  width: 400px;
  height: 300px;
}

.widget-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
  transform-style: preserve-3d;
}

.widget-card.flipped .widget-inner {
  transform: rotateY(180deg);
}

.widget-front, .widget-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.widget-back {
  transform: rotateY(180deg);
}
```

### Widget Layout
- **Flexbox Grid**: Simple responsive layout for widgets
- **Add Button**: Fixed position in top-right corner
- **Schema Sidebar**: Collapsible panel showing database structure

## Security & Error Handling

### Security Measures
- **SQL Validation**: Only SELECT queries allowed, parse and validate before execution
- **File Upload Security**: SQLite format validation, size limits, secure temporary storage
- **Query Timeout**: Prevent long-running queries from blocking the app
- **Input Sanitization**: Escape special characters in user inputs

### Error Handling
- **Query Errors**: Show SQL error messages clearly in the widget
- **Pagination Errors**: Handle edge cases gracefully (empty results, invalid page)
- **Upload Errors**: Clear feedback for invalid or corrupted database files
- **Connection Handling**: Manage database connection lifecycle properly

## Development Phases

### Phase 1: Development Environment (Week 1) ✅
- [x] Set up Biome for formatting and linting
- [x] Create Makefile with dev, format, lint, test commands
- [x] Add GitHub Actions workflow for code quality checks  
- [x] Set up basic project structure with test directories
- [x] **Milestone**: Complete dev environment with formatting, linting, and CI/CD

### Phase 2: Foundation (Week 2) ✅
- [x] Set up Bun server with file upload endpoint
- [x] Implement SQLite file handling and schema introspection  
- [x] Create upload interface and schema sidebar
- [x] **Milestone**: Upload SQLite file and view database structure

### Phase 3: Basic Widget System (Week 2-3)  
- [ ] Create flip card widget component with CSS animations
- [ ] Add "Add Widget" button in top-right corner
- [ ] Implement basic SQL query editor (back of card)
- [ ] **Milestone**: Create widgets and edit SQL queries

### Phase 4: Query Execution & Results (Week 3)
- [ ] Add query execution API endpoint
- [ ] Display results in table format (front of card)
- [ ] Implement flip button to switch between edit/view modes
- [ ] **Milestone**: Execute queries and see results in widgets

### Phase 5: Pagination System (Week 3-4)
- [ ] Implement LIMIT/OFFSET pagination logic
- [ ] Add prev/next navigation controls
- [ ] Track pagination state per widget
- [ ] Reset pagination when query changes
- [ ] **Milestone**: Browse through large query results with pagination

### Phase 6: Polish & UX (Week 4)
- [ ] Improve error handling and user feedback
- [ ] Add responsive design for different screen sizes
- [ ] Optimize performance for large datasets
- [ ] **Milestone**: Production-ready query widget system

## File Structure

```
insight-magician/
├── index.js                 # Main Bun server
├── index.html              # Frontend entry point  
├── package.json            # Project dependencies
├── CLAUDE.md               # Development guidelines
├── plan.md                 # This document
├── public/                 # Frontend assets
│   ├── app.js              # Main frontend application
│   ├── style.css           # Global styles including flip card CSS
│   ├── components/         # UI components
│   │   ├── widget.js       # Flip card widget implementation
│   │   ├── upload.js       # File upload component
│   │   └── schema.js       # Schema sidebar component
│   └── lib/                # Frontend utilities
├── lib/                    # Backend modules
│   ├── database.js         # SQLite operations and schema introspection
│   ├── query.js           # Query validation and execution
│   └── upload.js          # File upload handling
├── routes/                 # API endpoint handlers
│   ├── upload.js          # POST /api/upload endpoint
│   ├── schema.js          # GET /api/schema endpoint
│   └── query.js           # POST /api/query endpoint
├── uploads/                # Temporary database file storage
└── tests/                  # Test files
    ├── unit/               # Unit tests
    │   ├── database.spec.js
    │   ├── query.spec.js
    │   └── widget.spec.js
    └── integration/        # Integration tests
        ├── upload.spec.js
        └── widget.spec.js
```

## Key Design Decisions

1. **Bun Over Node**: Leverages Bun's speed and built-in SQLite support
2. **Vanilla JS Frontend**: Avoids framework complexity, uses Bun's bundling
3. **SQL-First UX**: Direct SQL editing for maximum flexibility and control
4. **Flip Card Pattern**: Intuitive edit/view mode switching with CSS animations
5. **Automatic Pagination**: Transparent LIMIT/OFFSET handling with state persistence

## Success Metrics

- **User Experience**: Users can create query widgets in under 2 minutes
- **Performance**: Page loads under 2s, queries execute under 5s with pagination
- **Error Recovery**: Clear SQL error messages and validation feedback
- **Widget Management**: Smooth flip animations and pagination state persistence
- **Mobile Support**: Responsive design works on tablets and phones

## Next Steps

1. **Core Server**: Implement basic Bun server with file upload and query endpoints
2. **Database Layer**: Create SQLite handling and schema introspection
3. **Upload Interface**: Build file upload UI and schema sidebar
4. **Widget Foundation**: Create flip card CSS and basic widget structure
5. **Query System**: Implement SQL execution with pagination logic

## Dependencies

### Backend Dependencies
```json
{
  "name": "insight-magician",
  "type": "module"
}
```

### Frontend Dependencies
- No external dependencies needed
- Bun handles all bundling automatically

## Environment Variables
```
MAX_UPLOAD_SIZE=100MB
QUERY_TIMEOUT=30000
TEMP_DIR=./uploads
```

---