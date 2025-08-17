# AI Tool Calling Implementation Plan - Incremental Approach

## Overview

This plan implements OpenRouter tool calling functionality one tool at a time. Each phase adds exactly one new tool and is independently testable and demoable. We start with simple read-only tools and progress to complex write operations.

**Total Tools**: 6 tools implemented across 6 phases  
**Approach**: Incremental - each phase adds one tool and updates the system prompt accordingly

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

---

## Phase 1: Infrastructure + Schema Tool

**Goal**: Build OpenRouter tool calling infrastructure and implement one simple tool

**Tool Added**: `get_schema_info` - Get database table structure and information

**Why This Tool First**: 
- Read-only and safe
- Uses existing `/api/schema` endpoint
- Simple to implement and test
- Provides immediate value for users exploring their data

**Task List** (Check off completed tasks with ✅):

### Core Infrastructure
- ✅ Update `lib/openrouter-client.js`:
  - ✅ Add `tools` parameter to `createChatCompletion()` method
  - ✅ Handle tool call responses from OpenRouter API
  - ✅ Add proper error handling for tool call failures
  - ✅ Update request/response interfaces for tool calling
  - ✅ Add comprehensive API request/response logging
- ✅ Update `routes/chat.js`:
  - ✅ Accept tools array in request body
  - ✅ Handle tool call responses from OpenRouter
  - ✅ Implement tool execution workflow
  - ✅ Send tool results back to OpenRouter for final AI response
  - ✅ Add proper error handling for tool execution failures
  - ✅ Add detailed tool calling flow logging
- ✅ Create `lib/tool-executor.js`:
  - ✅ Design tool registry system for registering available tools
  - ✅ Implement safe tool execution with parameter validation
  - ✅ Add tool result formatting and error handling
  - ✅ Create base tool interface/abstract class
  - ✅ Add tool execution logging and debugging
  - ✅ Handle empty arguments from AI (fix JSON parsing issue)

### Schema Tool Implementation
- ✅ Create `lib/tools/schema-tool.js`:
  - ✅ Implement `get_schema_info` tool class extending base tool
  - ✅ Call existing `/api/schema` endpoint for database structure
  - ✅ Format schema information for AI consumption (tables, columns, types)
  - ✅ Handle optional table name parameter for specific table info
  - ✅ Add error handling for missing database connections
  - ✅ Include row counts and sample data where helpful
- ✅ Update `lib/tool-executor.js`:
  - ✅ Register `get_schema_info` tool in tool registry
  - ✅ Test tool execution with sample parameters

### System Prompt Updates
- ✅ Update `lib/ai-system-prompt.js`:
  - ✅ Add tool calling awareness
  - ✅ Describe the ONE available tool: `get_schema_info`
  - ✅ Include guidance on when to use the schema tool
  - ✅ Add examples of schema exploration patterns
  - ✅ Keep it simple - don't mention tools that don't exist yet

### Frontend Integration
- ✅ Update `public/components/ai-chat.js`:
  - ✅ Add `processToolResult()` method to handle tool execution results
  - ✅ Update `sendMessage()` to include tools array in API calls (with just schema tool)
  - ✅ Add basic visual indicators for tool execution
  - ✅ Handle tool execution errors with user-friendly messages
- ✅ Update `public/app.js`:
  - ✅ Expose global `window.app` reference for tool result processing
  - ✅ Add basic error handling for tool-initiated operations

### Test Writing and Quality Assurance
- ✅ Write unit tests:
  - ✅ Create `tests/unit/lib/openrouter-client.test.js` - Test tool calling extensions
  - ✅ Create `tests/unit/lib/tool-executor.test.js` - Test tool registry and execution
  - ✅ Create `tests/unit/lib/tools/schema-tool.test.js` - Test schema tool functionality
  - ✅ Create `tests/unit/routes/chat.test.js` - Test chat endpoint with tool calling
- ✅ Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - ✅ Create `tests/integration/ai-chat-tool-calling.test.js` - End-to-end tool calling with mocked AI responses
  - ✅ Schema tool with real database, mocked AI (integrated into main test)
  - ✅ Frontend tool result processing with mocked responses (integrated into main test)
- ✅ Run code quality checks:
  - ✅ Run `make check` to verify formatting and linting
- ✅ Run test suites:
  - ✅ Run `make test-unit` to execute unit tests
  - ✅ Run `make test-integration` to execute integration tests
  - ✅ Fix race condition issues and flaky tests
  - ✅ All tests passing (229 total)

**Success Criteria:**
- AI can successfully call `get_schema_info` tool
- Tool returns properly formatted database schema information
- AI can explain database structure to users
- Frontend displays tool execution and results clearly

**Manual Testing:**
- "What tables are in this database?"
- "Tell me about the users table"
- "What's the structure of this database?"

---

## Phase 2: Add Widget Listing Tool

**Goal**: Add widget state awareness to enable dashboard-aware conversations

**Tool Added**: `list_widgets` - Get information about current widgets on dashboard

**Why Second**: 
- Still read-only and safe
- Enables AI to understand current dashboard state
- Sets up foundation for widget manipulation in later phases
- Allows testing of multi-tool scenarios

**Task List** (Check off completed tasks with ✅):

### Widget Listing Tool Implementation
- Create `lib/tools/list-widgets-tool.js`:
  - Implement `list_widgets` tool class extending base tool
  - Access current widget state from frontend session
  - Format widget information for AI (IDs, titles, types, queries, dimensions)
  - Include widget status (showing data, in edit mode, error state)
  - Handle empty dashboard state gracefully
  - Return widget layout information for dashboard awareness

### Tool Registration and System Updates
- Update `lib/tool-executor.js`:
  - Register `list_widgets` tool in tool registry
  - Test multi-tool execution scenarios
- Update `lib/ai-system-prompt.js`:
  - Add description of `list_widgets` tool
  - Update to mention TWO available tools now
  - Add guidance on when to check existing widgets
  - Include examples of dashboard awareness patterns

### Frontend Integration Enhancement
- Update `public/app.js`:
  - Add `getWidgetListForTools()` method for widget state access
  - Ensure widget state is accessible to backend tools

### Test Writing and Quality Assurance
- Write unit tests:
  - Create `tests/unit/lib/tools/list-widgets-tool.test.js` - Test widget listing tool functionality
  - Update `tests/unit/lib/tool-executor.test.js` - Add multi-tool registry tests
  - Update `tests/unit/routes/chat.test.js` - Test chat endpoint with multiple tools
- Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - Create `tests/integration/multi-tool-selection.test.js` - Test mocked AI choosing between tools
  - Create `tests/integration/widget-listing-integration.test.js` - Widget listing with real dashboard state, mocked AI
  - Update `tests/integration/tool-calling-basic.test.js` - Add widget listing scenarios with mocked responses
- Run code quality checks:
  - Run `make check` to verify formatting and linting
- Run test suites:
  - Run `make test-unit` to execute unit tests
  - Run `make test-integration` to execute integration tests
  - Fix any failing tests before proceeding to Phase 3

**Success Criteria:**
- AI can list existing widgets and understand dashboard state
- AI can choose between schema and widget tools appropriately
- Tool selection works correctly with multiple tools available

**Manual Testing:**
- "What widgets do I currently have?"
- "What tables are in this database and what widgets am I using?"
- Test AI choosing correct tool for each question

---

## Phase 3: Add SQL Query Tool

**Goal**: Enable AI to answer data questions by executing SQL queries

**Tool Added**: `execute_sql_query` - Run SQL queries to analyze data and answer questions

**Why Third**: 
- First tool that executes user data queries
- Still read-only but much more powerful
- Enables real data analysis conversations
- Tests more complex tool decision making

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

### Tool Registration and System Updates
- Update `lib/tool-executor.js`:
  - Register `execute_sql_query` tool in tool registry
  - Add database context passing to SQL tool
  - Test tool execution with various query types
- Update `lib/ai-system-prompt.js`:
  - Add description of `execute_sql_query` tool
  - Update to mention THREE available tools now
  - Add guidance on when to use SQL queries vs just getting schema
  - Include examples of good analytical queries
  - Add data exploration patterns and common SQL templates

### Test Writing and Quality Assurance
- Write unit tests:
  - Create `tests/unit/lib/tools/sql-query-tool.test.js` - Test SQL query tool functionality
  - Create `tests/unit/lib/query-result-formatter.test.js` - Test query result formatting utilities
  - Update `tests/unit/lib/tool-executor.test.js` - Add SQL tool execution tests
- Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - Create `tests/integration/sql-query-integration.test.js` - SQL tool with real database queries, mocked AI
  - Create `tests/integration/three-tool-selection.test.js` - Test mocked AI choosing among 3 tools
  - Update `tests/integration/tool-calling-basic.test.js` - Add SQL query scenarios with mocked responses
- Run code quality checks:
  - Run `make check` to verify formatting and linting
- Run test suites:
  - Run `make test-unit` to execute unit tests
  - Run `make test-integration` to execute integration tests
  - Fix any failing tests before proceeding to Phase 4

**Success Criteria:**
- AI can execute SQL queries to answer user questions
- AI chooses between schema, widget listing, and SQL execution appropriately
- Query results are properly formatted and interpreted by AI

**Manual Testing:**
- "How many users are in the database?"
- "What are the top 5 selling products?"
- "Show me sales data for the last month"

---

## Phase 3.5: Multi-Tool Workflow Capabilities

**Goal**: Enable AI to chain multiple tool calls in a single user request for sophisticated data analysis

**Enhancement Added**: Multi-tool looping infrastructure to allow AI to use schema + query tools together

**Why Phase 3.5**: 
- Unlocks the true potential of existing tools by combining them intelligently
- AI can explore schema first, then craft contextually-aware SQL queries
- Enables complex data analysis without adding new tools
- Natural progression: simple tool calling → intelligent tool chaining
- Foundation for even more sophisticated workflows in later phases

**Key Capabilities Unlocked**:
- **Schema-Informed Queries**: AI explores database structure, then writes optimized SQL
- **Complex Analysis**: Multi-step data exploration in single user requests  
- **Error Recovery**: AI can retry queries with schema context if initial attempts fail
- **Intelligent Joins**: AI understands relationships and crafts appropriate JOIN queries

**Task List** (Check off completed tasks with ✅):

### Multi-Tool Loop Infrastructure
- Update `routes/chat.js`:
  - Add iterative tool calling loop with configurable max iterations (default: 10)
  - Continue processing as long as AI requests more tool calls
  - Track conversation state across multiple tool call rounds
  - Add safety limits to prevent infinite loops
  - Include tool execution history in AI context
  - Handle errors gracefully without breaking the loop

### Enhanced Tool Coordination  
- Update `lib/tool-executor.js`:
  - Add tool execution history tracking
  - Optimize tool result formatting for multi-step workflows
  - Add context preservation between tool calls
  - Include execution timing and performance metrics
- Update `lib/openrouter-client.js`:
  - Add conversation state management for longer tool sequences
  - Optimize token usage for multi-tool conversations
  - Add request deduplication for repeated tool calls

### AI Workflow Optimization
- Update `lib/ai-system-prompt.js`:
  - Add guidance for multi-tool workflows and tool chaining
  - Include examples of schema exploration followed by targeted queries
  - Encourage AI to explain its analysis process
  - Add patterns for common analytical workflows
  - Include guidance on when to stop vs continue tool calling

### Frontend Progress Indicators
- Update `public/components/ai-chat.js`:
  - Add multi-step progress indicators for tool chains
  - Show "AI is analyzing schema..." → "AI is querying data..." flow
  - Handle longer response times gracefully with progress feedback
  - Display intermediate results when beneficial

### Test Multi-Tool Workflows
- Write integration tests:
  - Create `tests/integration/multi-tool-workflows.test.js` - Test schema→query chains with mocked AI
  - Create `tests/integration/complex-analysis.test.js` - Multi-step data analysis scenarios with mocked AI  
  - Update `tests/integration/ai-chat-tool-calling.test.js` - Add multi-tool workflow test cases
- Write unit tests:
  - Update `tests/unit/chat-route.test.js` - Add multi-tool loop logic tests
  - Create `tests/unit/tool-chain-executor.test.js` - Test tool chaining coordination
- Create @expensive validation test:
  - Create `tests/integration/ai-multi-tool-expensive.test.js` - Real AI multi-tool workflow validation
- Run code quality checks:
  - Run `make check` to verify formatting and linting
- Run test suites:
  - Run `make test-unit` and `make test-integration`
  - Verify all multi-tool scenarios work correctly

**Success Criteria:**
- AI can chain schema exploration with targeted SQL queries in single requests
- Tool loops terminate properly without hitting safety limits
- Performance remains acceptable with multi-tool workflows (< 5 minutes total)
- Error handling works correctly if any tool in the chain fails
- Frontend provides clear feedback during multi-step operations

**Example Workflows Enabled:**
- **"Show me the biggest customers by total order value"**
  1. AI calls `get_schema_info` → learns about Customers, Orders, Order_Details tables
  2. AI calls `execute_sql_query` → runs complex JOIN to calculate totals
  3. AI responds with formatted results and insights

- **"Find products that are selling poorly"**  
  1. AI calls `get_schema_info` → understands Products and sales relationship
  2. AI calls `execute_sql_query` → queries for low-selling products with context
  3. AI provides analysis with specific product recommendations

- **"What's the trend in our monthly revenue?"**
  1. AI calls `get_schema_info` → identifies date and revenue columns
  2. AI calls `execute_sql_query` → builds time-based aggregation query
  3. AI responds with trend analysis and insights

**Performance Considerations:**
- Maximum 10 tool call rounds per request - enough for sophisticated analysis workflows
- Tool execution history included in context for AI learning
- Graceful degradation if any tool in the chain fails
- Clear timeout handling for long-running multi-tool sequences

---

## Phase 4: Add Widget Creation Tool

**Goal**: Enable AI to create dashboard widgets from natural language requests

**Tool Added**: `create_widget` - Create new chart or table widgets on the dashboard

**Why Fourth**: 
- First write operation that modifies the dashboard
- Most complex tool with validation, chart function generation
- Builds on previous tools (uses schema info, checks existing widgets, queries data)
- Major value delivery - users can create visualizations through conversation

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

### Frontend Widget Integration
- Update `public/app.js`:
  - Add `createWidgetFromTool(widgetConfig)` method
  - Ensure widget creation integrates with existing widget system
  - Test widget persistence after tool-based creation
  - Add error handling for widget creation failures
- Update `public/components/ai-chat.js`:
  - Handle `widget_created` action in `processToolResult()`
  - Show success feedback when widgets are created

### Tool Registration and System Updates
- Update `lib/tool-executor.js`:
  - Register `create_widget` tool in tool registry
  - Add widget state coordination with frontend
  - Handle widget creation errors and rollback
- Update `lib/ai-system-prompt.js`:
  - Add description of `create_widget` tool
  - Update to mention FOUR available tools now
  - Integrate chart function examples from `examples/` directory
  - Add widget creation best practices and size guidelines
  - Include guidance on chart type selection based on data

### Test Writing and Quality Assurance
- Write unit tests:
  - Create `tests/unit/lib/tools/widget-creation-tool.test.js` - Test widget creation tool functionality
  - Create `tests/unit/lib/chart-function-generator.test.js` - Test chart function generation
  - Update `tests/unit/public/app.test.js` - Add `createWidgetFromTool()` method tests
- Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - Create `tests/integration/widget-creation-integration.test.js` - Widget creation with real DOM and data, mocked AI
  - Create `tests/integration/chart-widget-creation.test.js` - Graph widget creation with D3.js functions, mocked AI
  - Create `tests/integration/four-tool-workflow.test.js` - Test mocked AI using all 4 tools in combination
  - Update `tests/integration/ai-chat-tool-ui.test.js` - Add widget creation UI interactions with mocked responses
- Run code quality checks:
  - Run `make check` to verify formatting and linting
- Run test suites:
  - Run `make test-unit` to execute unit tests
  - Run `make test-integration` to execute integration tests
  - Fix any failing tests before proceeding to Phase 5

**Success Criteria:**
- AI can create functional widgets from natural language requests
- Widgets appear on dashboard with proper data and formatting
- AI chooses appropriate chart types based on data structure
- Chart functions work correctly for graph widgets

**Manual Testing:**
- "Create a bar chart showing sales by category"
- "Make a table with the top 10 customers"
- "Show me a pie chart of product distribution"

---

## Phase 5: Add Widget Editing Tool

**Goal**: Enable AI to modify existing widgets based on user requests

**Tool Added**: `edit_widget` - Modify properties of existing widgets

**Why Fifth**: 
- Second write operation, builds on widget creation
- Enables iterative dashboard improvement
- Tests widget state management and updates
- Completes core widget manipulation capabilities

**Task List** (Check off completed tasks with ✅):

### Widget Editing Tool Implementation
- Create `lib/tools/widget-edit-tool.js`:
  - Implement `edit_widget` tool class extending base tool
  - Handle widget ID validation and lookup
  - Support editing title, query, chartFunction, and widgetType
  - Validate new SQL queries before applying changes
  - Validate new chart functions for graph widgets
  - Re-execute queries when SQL changes
  - Return updated widget configuration

### Frontend Widget Update Integration
- Update `public/app.js`:
  - Add `updateWidgetFromTool(widgetConfig)` method
  - Ensure widget updates work with existing widget system
  - Test real-time widget updates in dashboard
  - Add error handling for widget update failures
- Update `public/components/ai-chat.js`:
  - Handle `widget_updated` action in `processToolResult()`
  - Show success feedback when widgets are updated

### Tool Registration and System Updates
- Update `lib/tool-executor.js`:
  - Register `edit_widget` tool in tool registry
  - Add widget state synchronization logic
  - Handle concurrent widget modifications
- Update `lib/ai-system-prompt.js`:
  - Add description of `edit_widget` tool
  - Update to mention FIVE available tools now
  - Add guidance on when to edit vs create new widgets
  - Include examples of widget modification patterns

### Test Writing and Quality Assurance
- Write unit tests:
  - Create `tests/unit/lib/tools/widget-edit-tool.test.js` - Test widget editing tool functionality
  - Update `tests/unit/public/app.test.js` - Add `updateWidgetFromTool()` method tests
  - Test widget state synchronization and validation
- Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - Create `tests/integration/widget-editing-integration.test.js` - Widget editing with real DOM updates, mocked AI
  - Create `tests/integration/widget-query-update.test.js` - Test SQL query changes and re-execution, mocked AI
  - Create `tests/integration/five-tool-workflow.test.js` - Test mocked AI using all 5 tools in combination
  - Update `tests/integration/ai-chat-tool-ui.test.js` - Add widget editing UI interactions with mocked responses
- Run code quality checks:
  - Run `make check` to verify formatting and linting
- Run test suites:
  - Run `make test-unit` to execute unit tests
  - Run `make test-integration` to execute integration tests
  - Fix any failing tests before proceeding to Phase 6

**Success Criteria:**
- AI can modify existing widgets based on user requests
- Widget changes appear immediately on dashboard
- AI properly validates widget IDs and handles errors
- Database queries are re-executed when SQL changes

**Manual Testing:**
- "Change the title of widget 1 to 'Monthly Revenue'"
- "Update the sales chart to show data for this year only"
- "Convert that table widget to a bar chart"

---

## Phase 6: Add Widget Resizing Tool + Final Polish

**Goal**: Complete the tool suite and add final UX improvements

**Tool Added**: `resize_widget` - Change widget dimensions for better layout

**Why Last**: 
- Completes the full 6-tool suite
- Simple operation that rounds out widget management
- Allows focus on UX polish and optimization
- Final validation of complete system

**Task List** (Check off completed tasks with ✅):

### Widget Resizing Tool Implementation
- Create `lib/tools/widget-resize-tool.js`:
  - Implement `resize_widget` tool class extending base tool
  - Handle widget ID validation and lookup
  - Validate width and height constraints (1-4 for each dimension)
  - Apply size changes and trigger frontend updates
  - Return confirmation of resize operation

### Frontend Widget Resize Integration
- Update `public/app.js`:
  - Add `resizeWidgetFromTool(widgetId, dimensions)` method
  - Ensure resize integrates with existing widget system
  - Add visual feedback for widget modifications
- Update `public/components/ai-chat.js`:
  - Handle `widget_resized` action in `processToolResult()`
  - Show success feedback when widgets are resized

### Enhanced Chat UI and Error Handling
- Update `public/components/ai-chat.js`:
  - Add visual indicators for tool execution in progress (spinner, status text)
  - Show which specific tool is being executed
  - Display tool execution results in chat with clear formatting
  - Add tool execution progress feedback for multi-step operations
  - Handle tool execution timeouts with user-friendly messages
- Create `lib/tools/response-formatter.js`:
  - Format tool results for optimal AI and user understanding
  - Create consistent error message formats across all tools
  - Add helpful recovery suggestions for common tool failures
  - Format complex data structures for chat display

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

### Final System Updates
- Update `lib/tool-executor.js`:
  - Register `resize_widget` tool in tool registry
  - Add final error handling improvements
  - Optimize tool execution performance
- Update `lib/ai-system-prompt.js`:
  - Add description of `resize_widget` tool
  - Update to mention ALL SIX available tools
  - Add comprehensive widget management guidance
  - Include complex multi-tool workflow examples

### Test Writing and Quality Assurance
- Write unit tests:
  - Create `tests/unit/lib/tools/widget-resize-tool.test.js` - Test widget resizing tool functionality
  - Create `tests/unit/lib/tools/response-formatter.test.js` - Test response formatting utilities
  - Update `tests/unit/public/app.test.js` - Add `resizeWidgetFromTool()` method tests
  - Create `tests/unit/lib/multi-tool-coordinator.test.js` - Test multi-tool coordination logic
- Write integration tests (using Playwright mocks like `ai-chat-basic.test.js`):
  - Create `tests/integration/widget-resizing-integration.test.js` - Widget resizing with real DOM updates, mocked AI
  - Create `tests/integration/complete-tool-suite.test.js` - Test all 6 tools working together with mocked AI
  - Create `tests/integration/multi-tool-workflows.test.js` - Complex multi-step tool combinations with mocked AI
  - Create `tests/integration/tool-execution-ui.test.js` - Enhanced UI indicators and error handling with mocked AI
  - Update `tests/integration/ai-chat-tool-ui.test.js` - Add final UI enhancements with mocked responses
- Write final @expensive test:
  - Create `tests/integration/ai-complete-workflow-expensive.test.js` - Real AI end-to-end workflow validation
    - Test complete user journey: "Create a sales chart showing revenue by month and make it bigger"
    - Validate AI tool selection, natural language understanding, and multi-step workflows
    - Only run this after all mocked tests pass to validate the complete experience
- Run final code quality checks:
  - Run `make check` to verify formatting and linting
- Run comprehensive test suites:
  - Run `make test-unit` to execute all unit tests
  - Run `make test-integration` to execute all integration tests
  - Verify all tool calling functionality works end-to-end
  - Document any known issues or limitations

**Success Criteria:**
- All 6 tools work independently and in combination
- AI can manage complete dashboard workflows through conversation
- Multi-tool requests work smoothly with good UX
- System is stable and well-tested

**Manual Testing:**
- "Make widget 2 bigger"
- "Create a sales chart and make it larger, then show me the top customers"
- "Resize the revenue table to be more compact"

---

## Technical Architecture

### Tool Execution Flow

**Complete Example: "Create a bar chart showing sales by category"**

1. **Frontend Request** → `AIChatComponent.sendMessage()`
   ```javascript
   POST /api/chat {
     message: "Create a bar chart showing sales by category",
     chatHistory: [...],
     tools: [getCurrentToolsArray()] // Only tools implemented so far
   }
   ```

2. **OpenRouter API** → Returns tool call request
   ```json
   {
     "tool_calls": [{
       "id": "call_123",
       "function": {
         "name": "create_widget",
         "arguments": "{\"title\":\"Sales by Category\",\"widgetType\":\"graph\",\"query\":\"SELECT category, SUM(amount) as total FROM sales GROUP BY category\",\"width\":2,\"height\":2,\"chartFunction\":\"function createChart(...) { ... }\"}"
       }
     }]
   }
   ```

3. **Backend Tool Execution** → `ToolExecutor.execute()`
   ```javascript
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

4. **Frontend Tool Processing** → `AIChatComponent.processToolResult()`
   ```javascript
   processToolResult(toolResult) {
     switch (toolResult.result.action) {
       case "widget_created":
         window.app.createWidgetFromTool(toolResult.result.widgetConfig);
         break;
       // Handle other actions as tools are added
     }
   }
   ```

### Progressive System Prompt Evolution

**Phase 1 Prompt** (Schema tool only):
```javascript
export const SYSTEM_PROMPT = `You are an AI assistant for Insight Magician, a data visualization tool.

You have access to one tool:
- get_schema_info: Get database table structure and information

Use this tool when users ask about their database structure, tables, or columns.`;
```

**Phase 4 Prompt** (4 tools):
```javascript
export const SYSTEM_PROMPT = `You are an AI assistant for Insight Magician, a data visualization tool.

You have access to these tools:
- get_schema_info: Get database table structure and information
- list_widgets: See current widgets on the dashboard
- execute_sql_query: Run SQL queries to analyze data
- create_widget: Create new chart or table widgets

[Chart function examples and widget guidance...]`;
```

### Quality Assurance Strategy

**Mock-First Testing Approach:**
- **Mocked Integration Tests**: Test all tool calling mechanics using `page.route()` to mock `/api/chat` responses
- **Real Component Testing**: Use actual databases, DOM manipulation, and widget systems with mocked AI responses
- **Progressive Validation**: Each phase builds on previous mocked test suite
- **Single @expensive Test**: One comprehensive end-to-end test with real AI after all mocked tests pass

**Benefits of Mock-First:**
- **Fast Feedback**: Tests run quickly without API costs during development
- **Reliable**: No dependency on external AI service availability
- **Comprehensive**: Can test edge cases and error scenarios easily
- **Cost Effective**: Only one expensive test validates the complete user experience

**Error Handling:**
- Each tool has comprehensive error handling
- Frontend gracefully handles tool failures  
- AI conversations continue even when tools fail
- Clear error messages guide users

---

## Success Criteria

**Phase Completion:**
- Each tool works independently and with existing tools
- System prompt accurately reflects available capabilities
- Frontend properly handles tool results
- All tests pass before proceeding

**Final Success:**
- Users can accomplish dashboard tasks through natural language
- AI intelligently chooses appropriate tools
- Tool execution is fast and reliable
- System is stable and well-documented

---

## Implementation Benefits

✅ **Incremental Value**: Each phase delivers working functionality  
✅ **Easy Debugging**: Issues isolated to the current tool being added  
✅ **Fast Feedback**: Get working demos quickly, iterate rapidly  
✅ **Honest Communication**: AI only knows about tools that actually work  
✅ **Progressive Complexity**: Start simple, add sophistication gradually  
✅ **Better Testing**: Each tool thoroughly validated before moving on

This approach ensures we build a robust, reliable tool calling system that users can depend on, one tool at a time.