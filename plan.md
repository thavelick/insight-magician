# AI Tool Calling Implementation Plan

## Overview

This plan implements tool calling functionality to allow the AI to:
1. Create or edit widgets (both chart and table widgets)
2. Run queries to answer questions about the database or schema
3. Resize widgets

Each phase is independently testable via UI interaction or curl requests.

## Current Architecture Analysis

**AI Chat System:**
- `AIChatComponent` handles UI, sends messages via `ChatAPI`
- `/api/chat` route uses `OpenRouterClient` with system prompt
- Simple text-only conversation flow currently

**Widget System:**
- `WidgetComponent` class manages individual widgets
- Supports data tables and D3.js charts with custom functions
- Grid layout with resizing (1-4 units width/height)
- Persisted via sessionStorage serialization

**Query System:**
- `/api/query` endpoint with SQL validation via `validateSql()`
- Pagination support, security restrictions (SELECT only)
- Results format: `{columns: [], rows: [][], totalRows, page, etc.}`

**Database Schema:**
- `/api/schema` provides table structure
- `DatabaseManager` handles SQLite connections

## Tool Definitions

```javascript
// Core tools the AI will have access to
const TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "Execute SQL query to analyze data and answer questions",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "SELECT query to execute" },
          explanation: { type: "string", description: "What this query is meant to find" }
        },
        required: ["query", "explanation"]
      }
    }
  },
  {
    type: "function", 
    function: {
      name: "create_widget",
      description: "Create a new chart or table widget on the dashboard",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Widget title" },
          widgetType: { type: "string", enum: ["data-table", "graph"] },
          query: { type: "string", description: "SQL query for widget data" },
          width: { type: "integer", minimum: 1, maximum: 4 },
          height: { type: "integer", minimum: 1, maximum: 4 },
          chartFunction: { type: "string", description: "D3.js chart function (required for graph type)" }
        },
        required: ["title", "widgetType", "query", "width", "height"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit_widget", 
      description: "Modify properties of an existing widget",
      parameters: {
        type: "object",
        properties: {
          widgetId: { type: "string", description: "ID of widget to edit" },
          title: { type: "string", description: "New title" },
          query: { type: "string", description: "New SQL query" },
          chartFunction: { type: "string", description: "New chart function" },
          widgetType: { type: "string", enum: ["data-table", "graph"] }
        },
        required: ["widgetId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "resize_widget",
      description: "Change widget dimensions",
      parameters: {
        type: "object", 
        properties: {
          widgetId: { type: "string", description: "ID of widget to resize" },
          width: { type: "integer", minimum: 1, maximum: 4 },
          height: { type: "integer", minimum: 1, maximum: 4 }
        },
        required: ["widgetId", "width", "height"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_widgets",
      description: "Get information about all existing widgets on the dashboard",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_schema_info",
      description: "Get database schema information",
      parameters: {
        type: "object",
        properties: {
          tableName: { type: "string", description: "Specific table name (optional)" }
        }
      }
    }
  }
];
```

## Phase 1: Tool Calling Infrastructure

**Goal**: Establish OpenRouter tool calling without implementing actual tools

**Implementation:**
- Extend `OpenRouterClient.createChatCompletion()` to accept `tools` parameter
- Handle tool call responses from OpenRouter API
- Create tool execution framework that can route to tool handlers
- Update chat endpoint to manage tool calling flow

**Files to Create/Modify:**
- `lib/openrouter-client.js` - Add tool calling support
- `routes/chat.js` - Handle tool execution workflow  
- `lib/tool-executor.js` - NEW: Central tool routing and execution
- `lib/ai-system-prompt.js` - **MAJOR UPDATE**: Add tool descriptions, chart examples from `examples/`, and widget usage patterns
- `public/components/ai-chat.js` - Add `processToolResult()` method for handling tool execution results
- `public/app.js` - Add tool integration methods: `createWidgetFromTool()`, `updateWidgetFromTool()`, `resizeWidgetFromTool()`

**Testing:**
- **Manual**: Send message "What can you help me with?" - should mention tool capabilities and chart types
- **Manual**: Ask "How do I create a bar chart?" - should reference examples from system prompt
- **Curl**: `POST /api/chat` with tools array, verify tool call parsing works
- **Expected**: AI responds about available capabilities with practical examples, no tools executed yet

**Unit Tests:**
- Tool definition validation
- Tool call response parsing
- Error handling for malformed tool calls

**Integration Tests:**
- Chat endpoint accepts tool definitions and returns proper structure
- Tool call flow with stub tools that return test data
- Error propagation from tool execution layer
- **@expensive**: Real OpenRouter API tool calling with working tools

---

## Phase 2: Schema and Widget State Tools

**Goal**: Allow AI to understand database structure and current dashboard state

**Implementation:**
- Create `get_schema_info` tool that calls existing `/api/schema` endpoint
- Create `list_widgets` tool that returns current widget configurations
- Format schema and widget information for AI consumption
- Handle both full schema and specific table requests

**Files to Create/Modify:**
- `lib/tools/schema-tool.js` - NEW: Schema information tool
- `lib/tools/list-widgets-tool.js` - NEW: Widget listing tool
- `lib/tool-executor.js` - Register both tools
- Update system prompt to describe when to use these tools

**Testing:**
- **Manual**: Ask "What tables are in this database?" and "What widgets are already on the dashboard?"
- **Curl**: Send tool calls for schema info and widget listing
- **Expected**: AI uses tools to fetch and explain database structure and current dashboard state

**Unit Tests:**
- Schema tool with various database structures
- Widget listing with different dashboard states
- Error handling for missing database/widgets
- Information formatting for AI consumption

**Integration Tests:**
- Full schema query through chat interface with test database
- Widget listing integration with real widget state
- Combined tool usage for dashboard awareness with test data
- **@expensive**: Real AI asking for schema and understanding database structure

---

## Phase 3: SQL Query Execution Tool

**Goal**: Let AI run queries to answer data questions

**Implementation:**
- Create `execute_sql_query` tool using existing `/api/query` logic
- Reuse SQL validation from `validateSql()`
- Format query results for AI interpretation
- Support pagination for large result sets

**Files to Create/Modify:**
- `lib/tools/sql-query-tool.js` - NEW: Query execution tool
- `lib/tool-executor.js` - Register SQL tool
- Add query result formatting utilities

**Testing:**
- **Manual**: Ask "How many users are in the database?"
- **Curl**: Tool call with SQL query
- **Expected**: AI executes query and provides answer with data

**Unit Tests:**
- SQL tool with various query types
- Query validation integration
- Result formatting for different data types

**Integration Tests:**
- End-to-end SQL query through chat with test database
- Error handling for invalid SQL with real validation
- Large result set handling with real pagination
- **@expensive**: Real AI analyzing data and generating SQL queries

---

## Phase 4: Widget Creation Tool

**Goal**: Enable AI to create dashboard widgets

**Implementation:**
- Create `create_widget` tool that integrates with existing widget system
- Use `App.addWidget()` or similar mechanism
- Generate appropriate chart functions for graph widgets
- Handle widget state persistence

**Files to Create/Modify:**
- `lib/tools/widget-creation-tool.js` - NEW: Widget creation
- `lib/tool-executor.js` - Register widget tool
- `public/app.js` - Expose widget creation API for tools
- Bridge between backend tool execution and frontend widget state

**Testing:**
- **Manual**: Say "Create a chart showing sales by month"
- **Curl**: Tool call for widget creation
- **Expected**: New widget appears on dashboard with data

**Unit Tests:**
- Widget creation with different configurations
- SQL query generation and validation
- Chart function generation for graphs

**Integration Tests:**
- Complete widget creation workflow with test database and real DOM
- Widget persistence after creation with real sessionStorage
- Multiple widget creation in single conversation with stub tool responses
- **@expensive**: Real AI creating charts and tables from natural language requests

---

## Phase 5: Widget Management Tools

**Goal**: Allow AI to edit and resize existing widgets

**Implementation:**
- Create `edit_widget` tool to modify widget properties
- Create `resize_widget` tool for layout management
- Integrate with existing widget methods
- Handle widget state synchronization

**Files to Create/Modify:**
- `lib/tools/widget-edit-tool.js` - NEW: Widget editing
- `lib/tools/widget-resize-tool.js` - NEW: Widget resizing
- `lib/tool-executor.js` - Register new tools
- Widget state management utilities

**Testing:**
- **Manual**: "Change widget 1 title to 'Revenue Report'" and "Make widget 2 bigger"
- **Curl**: Edit and resize tool calls
- **Expected**: Widgets update in real-time with new properties

**Unit Tests:**
- Widget editing with various property changes
- Resize validation and constraints
- Widget lookup and error handling

**Integration Tests:**
- Widget modification through chat interface with real widgets
- Multiple widget operations in sequence with real DOM updates
- Error handling for invalid widget IDs with real validation
- **@expensive**: Real AI managing complex dashboard layouts and modifications

---

## Phase 6: Enhanced User Experience

**Goal**: Polish tool calling UX and error handling

**Implementation:**
- Add visual indicators for tool execution in chat
- Implement tool execution progress feedback
- Enhanced error messages and recovery suggestions
- Multi-tool coordination and conflict resolution

**Files to Create/Modify:**
- `public/components/ai-chat.js` - Enhanced UI for tool calls
- `lib/tools/response-formatter.js` - NEW: Tool result formatting
- Enhanced error handling across all tools
- Tool execution analytics and logging

**Testing:**
- **Manual**: Complex requests like "Create a sales chart and make it larger, then show me the top customers"
- **Curl**: Multi-tool request scenarios
- **Expected**: Smooth tool execution with clear feedback

**Unit Tests:**
- Tool execution UI components
- Error message formatting
- Multi-tool coordination logic

**Integration Tests:**
- Complex multi-tool workflows with real tool execution
- Error recovery scenarios with real error conditions
- User experience edge cases with real UI interactions
- **@expensive**: Real AI handling complex multi-step requests with multiple tools

---

## System Prompt Strategy

The AI system prompt requires comprehensive updates across all phases to properly guide tool usage:

### Phase 1: Basic Tool Awareness
```javascript
export const SYSTEM_PROMPT = `You are an AI assistant for Insight Magician, a data visualization tool that helps users explore and analyze their databases.

You have access to powerful tools that allow you to:
- Query and analyze database content
- Create interactive charts and data tables 
- Manage existing widgets on the dashboard
- Explore database schema and structure

Available tools:
- get_schema_info: Understand database structure
- list_widgets: See current dashboard state
- execute_sql_query: Run analysis queries
- create_widget: Build new visualizations  
- edit_widget: Modify existing widgets
- resize_widget: Adjust widget layout

Always use tools when users ask for data analysis, visualizations, or dashboard management. Explain what you're doing as you use each tool.`;
```

### Phase 4+: Full Chart Examples Integration
The system prompt should include practical chart function examples from `examples/`:

```javascript
// Add to system prompt:
## Chart Function Examples

When creating graph widgets, use these proven patterns:

### Bar Chart Pattern (for categorical data with counts/values):
\`\`\`javascript
function createChart(data, svg, d3, width, height) {
  const maxValue = d3.max(data, d => d.count);
  const barWidth = width / data.length - 10;
  
  svg.selectAll('rect')
    .data(data)
    .enter().append('rect')
    .attr('x', (d, i) => i * (barWidth + 10) + 5)
    .attr('y', d => height - (d.count / maxValue) * (height - 40))
    .attr('width', barWidth)
    .attr('height', d => (d.count / maxValue) * (height - 40))
    .attr('fill', 'steelblue');
  
  // Add category labels
  svg.selectAll('text')
    .data(data)
    .enter().append('text')
    .attr('x', (d, i) => i * (barWidth + 10) + barWidth/2 + 5)
    .attr('y', height - 5)
    .attr('text-anchor', 'middle')
    .text(d => d.category);
    
  return svg;
}
\`\`\`

### Pie Chart Pattern (for part-to-whole relationships):
\`\`\`javascript  
function createChart(data, svg, d3, width, height) {
  const radius = Math.min(width, height) / 2 - 20;
  
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  
  const g = svg.append('g')
    .attr('transform', \`translate(\${width/2}, \${height/2})\`);
  
  const arcs = g.selectAll('.arc')
    .data(pie(data))
    .enter().append('g');
  
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => d3.schemeCategory10[i]);
  
  arcs.append('text')
    .attr('transform', d => \`translate(\${arc.centroid(d)})\`)
    .attr('text-anchor', 'middle')
    .text(d => d.data.name);
    
  return svg;
}
\`\`\`

Choose chart types based on data:
- Bar charts: categorical data, comparisons, rankings
- Pie charts: parts of a whole, percentages, composition
- Line charts: time series, trends, continuous data
- Tables: detailed data, multiple columns, exact values
```

### Widget Best Practices in Prompt
```javascript
// Add widget guidance:
## Widget Creation Guidelines

1. **Always check existing widgets first** with list_widgets before creating new ones
2. **Choose appropriate sizes**: 
   - Small widgets (1x1, 2x1): key metrics, simple charts
   - Medium widgets (2x2): detailed charts, small tables
   - Large widgets (3x2, 4x2): complex visualizations, large tables
3. **Use descriptive titles** that explain what the widget shows
4. **Match visualization to data type**:
   - Numerical trends → Line charts
   - Categories/comparisons → Bar charts  
   - Proportions → Pie charts
   - Detailed data → Tables
5. **Test queries before widget creation** using execute_sql_query
```

---

## Technical Architecture

### Tool Execution Flow

**Complete Example: "Create a bar chart showing sales by category"**

1. **Frontend Request** → `AIChatComponent.sendMessage()`
   ```javascript
   POST /api/chat {
     message: "Create a bar chart showing sales by category",
     chatHistory: [...],
     tools: [createWidgetTool, listWidgetsTool, ...]
   }
   ```

2. **OpenRouter API** → Returns tool call request
   ```json
   {
     "tool_calls": [{
       "id": "call_123",
       "function": {
         "name": "create_widget",
         "arguments": "{\"title\":\"Sales by Category\",\"widgetType\":\"graph\",\"query\":\"SELECT category, SUM(amount) as total FROM sales GROUP BY category\",\"width\":2,\"height\":2,\"chartFunction\":\"function createChart(data, svg, d3, width, height) { ... }\"}"
       }
     }]
   }
   ```

3. **Backend Tool Execution** → `ToolExecutor.execute()`
   ```javascript
   // Tool validates parameters, executes query, returns widget config
   const toolResult = {
     success: true,
     action: "widget_created", 
     widgetConfig: {
       id: "widget_123",
       title: "Sales by Category",
       widgetType: "graph",
       query: "SELECT category, SUM(amount) as total FROM sales GROUP BY category",
       width: 2, height: 2,
       chartFunction: "function createChart(...) { ... }",
       results: { columns: ["category", "total"], rows: [["Electronics", 15000], ...] }
     }
   }
   ```

4. **Backend Response** → Tool results + AI message
   ```json
   {
     "success": true,
     "message": "I've created a bar chart showing sales by category...",
     "toolResults": [{
       "toolCallId": "call_123",
       "result": toolResult
     }]
   }
   ```

5. **Frontend Tool Processing** → `AIChatComponent` handles tool results
   ```javascript
   // In sendMessage success handler:
   if (result.toolResults) {
     for (const toolResult of result.toolResults) {
       this.processToolResult(toolResult);
     }
   }
   
   processToolResult(toolResult) {
     switch (toolResult.result.action) {
       case "widget_created":
         window.app.createWidgetFromTool(toolResult.result.widgetConfig);
         break;
       case "widget_updated":
         window.app.updateWidgetFromTool(toolResult.result.widgetConfig);
         break;
       case "widget_resized":
         window.app.resizeWidgetFromTool(toolResult.result.widgetId, toolResult.result.dimensions);
         break;
     }
   }
   ```

6. **Frontend Widget Creation** → New `App` methods for tool integration
   ```javascript
   // New methods in App class:
   createWidgetFromTool(widgetConfig) {
     const widget = WidgetComponent.deserialize(
       widgetConfig,
       (id) => this.removeWidget(id),
       () => this.saveWidgets(),
       this.currentDatabase
     );
     
     this.widgets.set(widgetConfig.id, widget);
     
     const container = document.getElementById("widgets-container");
     container.appendChild(widget.getElement());
     
     this.saveWidgets();
   }
   
   updateWidgetFromTool(widgetConfig) {
     const widget = this.widgets.get(widgetConfig.id);
     if (widget) {
       // Update widget properties and refresh display
       Object.assign(widget, widgetConfig);
       widget.displayResults(widgetConfig.results);
       this.saveWidgets();
     }
   }
   ```

### Critical Bridge Components

**Frontend Changes Required:**
- `AIChatComponent.processToolResult()` - Handle tool execution results
- `App.createWidgetFromTool()` - Create widgets from tool configs  
- `App.updateWidgetFromTool()` - Update existing widgets from tools
- `App.resizeWidgetFromTool()` - Resize widgets from tools
- Global `window.app` reference for tool result processing

**Backend Tool Result Format:**
```javascript
// Standard tool result structure:
{
  success: true/false,
  action: "widget_created" | "widget_updated" | "widget_resized" | "query_executed" | "schema_fetched",
  data: { /* action-specific data */ },
  error?: "error message if success=false"
}
```

### Error Handling Strategy

- **Tool Validation**: Strict parameter validation before execution
- **SQL Security**: Reuse existing `validateSql()` for all query tools
- **Widget Safety**: Validate widget IDs and permissions
- **Graceful Degradation**: AI continues conversation even if tools fail
- **User Feedback**: Clear error messages with suggested alternatives

### State Management

- **Widget State**: Tools integrate with existing sessionStorage persistence
- **Database Context**: Tools have access to current database session
- **Chat History**: Tool calls and results included in conversation context
- **Error Recovery**: Failed tools don't break conversation flow

### Security Considerations

- **SQL Injection**: All queries validated through existing security layer
- **Resource Limits**: Tool execution timeouts and query complexity limits
- **Access Control**: Tools only access current user's database session
- **Input Validation**: Strict type checking for all tool parameters

### Performance Optimizations

- **Tool Selection**: AI chooses minimal necessary tools
- **Result Caching**: Cache schema info and repeated queries
- **Batch Operations**: Group related tool calls when possible
- **Async Execution**: Non-blocking tool execution with progress indicators

---

## Testing Strategy

### Unit Test Coverage
- Individual tool validation and execution
- Tool parameter parsing and validation
- Error handling for each tool type
- Integration with existing API endpoints

### Integration Test Scenarios

**Standard Integration Tests (run automatically):**
- Complete tool calling workflows end-to-end with real databases, widgets, and tool execution
- Multi-tool conversations with real state management and sessionStorage
- Error scenarios and recovery patterns with real validation and error handling
- Tool execution with test databases using real SQL queries and widget creation

**@expensive Tests (run manually by developer only):**
- Tests that make real OpenRouter API calls and cost money
- Tagged with `{ tag: "@expensive" }` in Playwright
- Run with `make test-integration-expensive` 
- Include actual AI reasoning, natural language processing, and tool selection
- Test scenarios:
  - Real AI understanding database schema and making intelligent suggestions
  - AI generating appropriate SQL queries from natural language
  - AI creating meaningful charts and tables based on user requests
  - AI managing complex dashboard workflows with multiple tool calls
  - AI handling error recovery and providing helpful guidance

**Integration vs @expensive Distinction:**
- **Integration**: Real tool execution, real database queries, real widget creation - but with programmatically triggered tool calls
- **@expensive**: Real AI decision-making and natural language understanding - uses actual OpenRouter API

### Manual Testing Workflows
- Data exploration: "What's in this database?"
- Widget creation: "Show me a chart of X by Y"
- Dashboard awareness: "What widgets do I have?" or "Make the sales chart bigger"
- Dashboard management: "Make that bigger and add a table"
- Complex analysis: "Find the top performers and create visualizations"

### Performance Testing
- Tool execution response times
- Large dataset handling
- Concurrent tool execution
- Memory usage during tool calls

---

## Success Criteria

- **Functionality**: All 6 tools work independently and in combination
- **Usability**: Users can accomplish widget tasks through natural language
- **Performance**: Tool calls complete within 3 seconds average
- **Reliability**: <2% tool execution failure rate
- **Integration**: Seamless integration with existing UI without breaking changes

---

## Implementation Notes

### OpenRouter Integration
- Follow OpenRouter's tool calling specification exactly
- Handle streaming responses if needed for long-running tools
- Implement proper error mapping from OpenRouter API responses

### Widget System Integration
- Reuse existing widget creation/modification patterns
- Maintain compatibility with manual widget operations
- Preserve widget persistence and serialization behavior

### Database Access
- Leverage existing `DatabaseManager` and query infrastructure
- Maintain all current security restrictions and validations
- Support multiple database sessions if needed

### Frontend Coordination
- Ensure tool-created widgets appear immediately in UI
- Handle concurrent tool execution and UI updates
- Maintain responsive UI during tool execution

This plan builds incrementally on the existing robust architecture while adding powerful AI tool calling capabilities that transform Insight Magician into an intelligent data exploration assistant.