# Adding New AI Tools

This guide explains how to create new AI tools for the Insight Magician system. Tools allow the AI to perform specific actions like reading data, creating widgets, or executing queries.

## What Are AI Tools?

AI tools are functions that the AI can call to interact with your application. When a user asks something like "What tables do I have?", the AI decides to call the `get_schema_info` tool to get that information.

Each tool has:
- **A name** that the AI uses to call it (like `get_schema_info`)
- **Parameters** that define what inputs it expects  
- **An execution function** that does the actual work
- **Return values** that give results back to the AI and the user

## Types of Tools

Looking at the existing tools, there are different patterns:

**Information Readers** (like `get_schema_info`, `list_widgets`)
- No complex parameters
- Read existing data 
- Return information for the AI to explain to users

**Data Processors** (like `execute_sql_query`)
- Take user inputs (SQL queries, explanations)
- Process data from the database
- Return formatted results

**Action Performers** (like `create_widget`)
- Take many parameters with validation
- Create or modify application state
- May need frontend integration

## Planning Your Tool

Before coding, ask yourself:

1. **What does it do?** Be specific about the single responsibility
2. **What inputs does it need?** Keep parameters minimal but sufficient
3. **Does it read or write?** Reading is simpler; writing needs more validation
4. **Does it affect the UI?** If yes, you'll need frontend integration
5. **What should the AI know?** How should the AI explain results to users?

## Implementation Steps

### 1. Create the Tool File

Create `lib/tools/your-tool.js` and extend the `BaseTool` class:

```javascript
import { BaseTool } from "./base-tool.js";

export class YourTool extends BaseTool {
  constructor() {
    super("your_tool_name", "Brief description");
  }
  
  // Required methods:
  getDefinition() { /* Tool parameters for AI */ }
  getPromptDescription() { /* Short description */ }
  getUsageGuidance() { /* When to use this tool */ }
  getExampleQueries() { /* User questions that trigger this */ }
  async execute(args, context) { /* The actual functionality */ }
}
```

### 2. Define Parameters for the AI

In `getDefinition()`, specify what inputs your tool expects:

```javascript
getDefinition() {
  return {
    type: "function",
    function: {
      name: "your_tool_name",
      description: "What this tool does",
      parameters: {
        type: "object",
        properties: {
          paramName: {
            type: "string",
            description: "What this parameter is for"
          }
        },
        required: ["paramName"]
      }
    }
  };
}
```

Parameter types: `string`, `number`, `boolean`, `array`, `object`
Validation: `enum: ["option1", "option2"]`, `minimum: 1`, `maximum: 100`

### 3. Write AI Guidance Methods

Help the AI understand when and how to use your tool:

```javascript
getUsageGuidance() {
  return "Use your_tool_name when users ask about X";
}

getExampleQueries() {
  return [
    "Show me the X",
    "What is the current Y?",
    "Update the Z settings"
  ];
}
```

### 4. Implement the Core Logic

Your `execute()` method does the actual work:

```javascript
async execute(args, context) {
  try {
    // 1. Validate inputs
    const { paramName } = args;
    if (!paramName) {
      return { success: false, error: "Missing required parameter" };
    }

    // 2. Do the work
    const result = await this.performAction(paramName, context);

    // 3. Return results
    return {
      success: true,
      data: result,
      message: "Operation completed successfully"
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Context includes**: `databasePath`, `widgets` (current dashboard state)

### 5. Register the Tool

Add to `lib/tool-registry.js`:

```javascript
import { YourTool } from "./tools/your-tool.js";

// In registerDefaultTools():
this.registerTool(new YourTool());
```

### 6. Add Frontend Integration (if needed)

**If your tool modifies the UI**, add handling in `public/components/ai-chat.js`:

```javascript
// In processToolResult() method:
case "your_action_name":
  // Handle the tool result
  window.app?.yourMethod(result.data);
  break;
```

**If you need app methods**, add to `public/app.js`:

```javascript
yourMethod(data) {
  // Implement UI changes
  return { success: true };
}
```

## Tool Complexity Examples

**Simple Tool** (`get_schema_info`):
- No parameters required
- Reads database schema
- Returns data for the AI to explain
- No frontend changes needed

**Medium Tool** (`execute_sql_query`):
- Requires SQL query and explanation
- Validates SQL syntax
- Executes query safely
- Returns formatted data

**Complex Tool** (`create_widget`):
- Many parameters with validation
- Creates database queries
- Generates frontend elements
- Requires error handling and rollback

## Writing Good Prompts

The AI system prompt includes your tool descriptions. Write them for the AI:

**Tool Name**: Use verb_noun pattern (`get_schema_info`, `create_widget`)

**Usage Guidance**: "Use X when users ask about Y" - be specific about triggers

**Example Queries**: Write realistic user questions that should trigger your tool

**Parameter Descriptions**: The AI reads these to understand what to send

## Testing Your Tool

1. **Unit Tests**: Test the tool logic directly with mock data
2. **Integration Tests**: Test with Playwright and mocked AI responses  
3. **Manual Testing**: Try real conversations with Claude

Focus your tests on:
- Parameter validation (required, optional, edge cases)
- Error handling (bad inputs, system failures)
- Return value format (success and failure cases)
- Frontend integration (if applicable)

## Common Patterns

**Validation**: Check required parameters first, validate formats and ranges

**Database Access**: Use the provided context, always handle connection errors

**Error Messages**: Be specific - the AI will show these to users

**Frontend Actions**: Return an `action` field that the frontend can process

**Logging**: Add console.log statements for debugging tool execution

## Best Practices

- **Keep tools focused**: One tool should do one thing well
- **Validate everything**: Bad inputs should return helpful error messages  
- **Handle failures gracefully**: Tools should never crash the system
- **Write for the AI**: Your descriptions and examples teach the AI when to use your tool
- **Test thoroughly**: Tools that sometimes work are worse than tools that never work

## Getting Started

Start simple. Look at `get_schema_info` or `list_widgets` for basic patterns. Once you understand the flow, tackle more complex tools like `execute_sql_query`.

