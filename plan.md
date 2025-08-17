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

**Task List** (Check off completed tasks with ✅):

### Backend Infrastructure
- Update `lib/openrouter-client.js`:
  - Add `tools` parameter to `createChatCompletion()` method
  - Handle tool call responses from OpenRouter API
  - Add proper error handling for tool call failures
  - Update request/response interfaces for tool calling
- Update `routes/chat.js`:
  - Accept tools array in request body
  - Handle tool call responses from OpenRouter
  - Implement tool execution workflow
  - Send tool results back to OpenRouter for final AI response
  - Add proper error handling for tool execution failures
- Create `lib/tool-executor.js`:
  - Design tool registry system for registering available tools
  - Implement safe tool execution with parameter validation
  - Add tool result formatting and error handling
  - Create base tool interface/abstract class
  - Add tool execution logging and debugging

### System Prompt and AI Guidance
- Update `lib/ai-system-prompt.js`:
  - Add tool awareness and descriptions of all 6 tools
  - Integrate chart function examples from `examples/simple-bar-chart.md`
  - Integrate chart function examples from `examples/simple-pie-chart.md`
  - Add widget creation best practices and size guidelines
  - Add guidance on when to use each tool type
  - Include SQL query patterns and data type recommendations

### Frontend Integration
- Update `public/components/ai-chat.js`:
  - Add `processToolResult()` method to handle tool execution results
  - Update `sendMessage()` to include tools array in API calls
  - Add visual indicators for tool execution in progress
  - Handle tool execution errors with user-friendly messages
  - Add support for displaying tool results in chat
- Update `public/app.js`:
  - Add `createWidgetFromTool(widgetConfig)` method
  - Add `updateWidgetFromTool(widgetConfig)` method  
  - Add `resizeWidgetFromTool(widgetId, dimensions)` method
  - Add `getWidgetListForTools()` method for widget state access
  - Expose global `window.app` reference for tool result processing
  - Add error handling for tool-initiated widget operations

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

**Task List** (Check off completed tasks with ✅):

### Schema Information Tool
- Create `lib/tools/schema-tool.js`:
  - Implement `get_schema_info` tool class extending base tool
  - Call existing `/api/schema` endpoint for database structure
  - Format schema information for AI consumption (tables, columns, types)
  - Handle optional table name parameter for specific table info
  - Add error handling for missing database connections
  - Include row counts and sample data where helpful

### Widget Listing Tool  
- Create `lib/tools/list-widgets-tool.js`:
  - Implement `list_widgets` tool class extending base tool
  - Access current widget state from frontend session
  - Format widget information for AI (IDs, titles, types, queries, dimensions)
  - Include widget status (showing data, in edit mode, error state)
  - Handle empty dashboard state gracefully
  - Return widget layout information for dashboard awareness

### Tool Registration and Integration
- Update `lib/tool-executor.js`:
  - Register `get_schema_info` tool in tool registry
  - Register `list_widgets` tool in tool registry
  - Add proper error handling for both tools
  - Test tool execution with sample parameters
- Update system prompt in `lib/ai-system-prompt.js`:
  - Add descriptions of when to use schema tool
  - Add descriptions of when to use widget listing tool
  - Include examples of how these tools inform widget creation decisions

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

**Task List** (Check off completed tasks with ✅):

### SQL Query Tool Implementation
- Create `lib/tools/sql-query-tool.js`:
  - Implement `execute_sql_query` tool class extending base tool
  - Integrate with existing `/api/query` endpoint logic
  - Reuse SQL validation from `validateSql()` for security
  - Handle query parameters (query, explanation) 
  - Support pagination parameters for large datasets
  - Format query results for AI consumption (summary + sample data)
  - Add error handling for SQL syntax errors and execution failures
  - Include query execution statistics (row count, execution time)

### Query Result Formatting
- Add query result formatting utilities:
  - Create concise data summaries for AI interpretation
  - Handle different data types (strings, numbers, dates, nulls)
  - Limit result size for AI processing while preserving meaning
  - Format error messages to be helpful for AI understanding
  - Include data type information and column metadata

### Tool Registration and Integration  
- Update `lib/tool-executor.js`:
  - Register `execute_sql_query` tool in tool registry
  - Add database context passing to SQL tool
  - Test tool execution with various query types
  - Add proper error propagation for SQL failures
- Update system prompt in `lib/ai-system-prompt.js`:
  - Add guidance on when to use SQL query tool vs widget creation
  - Include examples of good analytical queries
  - Add data exploration patterns and common SQL templates

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

**Task List** (Check off completed tasks with ✅):

### Widget Creation Tool Implementation
- Create `lib/tools/widget-creation-tool.js`:
  - Implement `create_widget` tool class extending base tool
  - Handle all widget parameters (title, widgetType, query, width, height, chartFunction)
  - Validate SQL queries using existing `validateSql()` 
  - Validate chart functions for graph widgets
  - Generate widget IDs and ensure uniqueness
  - Execute initial query to populate widget with data
  - Return complete widget configuration for frontend creation

### Chart Function Generation
- Add chart function generation capabilities:
  - Generate appropriate D3.js chart functions based on data structure
  - Use examples from `examples/simple-bar-chart.md` and `examples/simple-pie-chart.md`
  - Handle different data types (categorical, numerical, time series)
  - Provide fallback chart functions for common patterns
  - Validate generated chart function syntax before returning

### Widget Integration and State Management
- Update `lib/tool-executor.js`:
  - Register `create_widget` tool in tool registry
  - Add widget state coordination with frontend
  - Handle widget creation errors and rollback
  - Add logging for widget creation events
- Enhance frontend integration:
  - Ensure `createWidgetFromTool()` method works with tool results
  - Test widget persistence after tool-based creation
  - Verify real-time widget appearance in dashboard
  - Add error handling for widget creation failures

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

**Task List** (Check off completed tasks with ✅):

### Widget Editing Tool
- Create `lib/tools/widget-edit-tool.js`:
  - Implement `edit_widget` tool class extending base tool
  - Handle widget ID validation and lookup
  - Support editing title, query, chartFunction, and widgetType
  - Validate new SQL queries before applying changes
  - Validate new chart functions for graph widgets
  - Re-execute queries when SQL changes
  - Return updated widget configuration

### Widget Resizing Tool
- Create `lib/tools/widget-resize-tool.js`:
  - Implement `resize_widget` tool class extending base tool
  - Handle widget ID validation and lookup
  - Validate width and height constraints (1-4 for each dimension)
  - Apply size changes and trigger frontend updates
  - Return confirmation of resize operation
  - Handle resize conflicts and layout optimization

### Tool Registration and State Management
- Update `lib/tool-executor.js`:
  - Register `edit_widget` tool in tool registry
  - Register `resize_widget` tool in tool registry
  - Add widget state synchronization logic
  - Handle concurrent widget modifications
  - Add proper error handling for invalid widget IDs
- Enhance frontend integration:
  - Ensure `updateWidgetFromTool()` method works with edit results
  - Ensure `resizeWidgetFromTool()` method works with resize results
  - Test real-time widget updates in dashboard
  - Add visual feedback for widget modifications

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

**Task List** (Check off completed tasks with ✅):

### Enhanced Chat UI
- Update `public/components/ai-chat.js`:
  - Add visual indicators for tool execution in progress (spinner, status text)
  - Show which specific tool is being executed
  - Display tool execution results in chat with clear formatting
  - Add tool execution progress feedback for multi-step operations
  - Handle tool execution timeouts with user-friendly messages
  - Add "cancel tool execution" functionality if needed

### Response Formatting and Error Handling
- Create `lib/tools/response-formatter.js`:
  - Format tool results for optimal AI and user understanding
  - Create consistent error message formats across all tools
  - Add helpful recovery suggestions for common tool failures
  - Format complex data structures for chat display
  - Add success confirmations with actionable next steps
- Enhance error handling across all tools:
  - Add detailed error logging for debugging tool issues
  - Create user-friendly error messages for each tool type
  - Add automatic retry logic for transient failures
  - Implement graceful degradation when tools fail

### Multi-Tool Coordination and Analytics
- Add multi-tool coordination capabilities:
  - Handle tool execution conflicts and dependencies
  - Optimize tool execution order for efficiency
  - Add tool execution caching where appropriate
  - Handle concurrent tool requests gracefully
- Add tool execution analytics and logging:
  - Track tool usage patterns and performance metrics
  - Log tool execution times and success rates
  - Add debugging information for tool failures
  - Create tool execution reports for optimization

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