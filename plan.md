# AI Chat Feature Implementation Plan

## Overview
Add an AI chat sidebar that appears on the left side, pushing content to the right, similar to the existing schema view but mirrored. The chat will use OpenRouter with Claude 3.5 Haiku for server-side AI interactions.

## Architecture Pattern
Mirror the **schema sidebar** implementation (`/public/components/schema.js`) but position on the left side instead of right.

## Implementation Steps

*Mark completed tasks with ✅ at the beginning of each line as you progress through implementation.*

### Phase 1: Basic Chat UI Structure

**Goal:** Create a working chat interface that slides in from the left and echoes user messages. No AI integration yet - just focus on the UI/UX foundation and basic message flow.

**Tasks:** *(Mark completed items with ✅)*
- ✅ Create AI Chat Component (`/public/components/ai-chat.js`)
  - ✅ Copy structure from `/public/components/schema.js`
  - ✅ Create sidebar DOM structure with header, messages container, and input area
  - ✅ Implement `show()` and `hide()` methods like schema component
  - ✅ Add close button event listener
  - ✅ Implement basic echo functionality (user types message, it echoes back)
- ✅ Add CSS Styles (`/public/style.css`)
  - ✅ Mirror `.schema-sidebar` styles but use `left` positioning instead of `right`
  - ✅ Create `body.ai-chat-open` class with `margin-left` (copy `body.schema-open` pattern)
  - ✅ Add chat-specific styling for messages and input containers
  - ✅ Style chat button to match existing button design
  - ✅ Add basic message styling (user vs assistant messages)
  - ✅ **Mobile Responsiveness**: Add mobile-specific CSS for AI chat sidebar (follow `.schema-sidebar` mobile pattern)
    - ✅ Full width sidebar on mobile (`width: 100vw`, `left: -100vw`)
    - ✅ Prevent body scrolling when chat open (`overflow: hidden`)
    - ✅ Smaller padding and font sizes for mobile
- ✅ Add Header Button (`/index.html`)
  - ✅ Add AI chat button to `.main-buttons` section following existing pattern
- ✅ Integrate with Main App (`/public/app.js`)
  - ✅ Import AIChatComponent 
  - ✅ Add component to constructor
  - ✅ Create `setupAIChatButton()` method following `setupViewSchemaButton()` pattern
  - ✅ Call setup method in `init()`
- ✅ **Integration Tests for Phase 1** (`/tests/integration/ai-chat-basic.test.js`) *(Read `/TESTING.md` first - set up response listeners BEFORE actions, avoid `waitForTimeout`, create helper functions early)*
  - ✅ Test AI chat button appears in header
  - ✅ Test sidebar slides in from left when button clicked
  - ✅ Test content pushes to the right (check `body.ai-chat-open` class)
  - ✅ Test close button hides sidebar
  - ✅ Test typing message and hitting send echoes the message back
  - ✅ Test chat history persists across page reloads (sessionStorage, not localStorage)
  - ✅ **Mobile Tests**: Test mobile responsive behavior (viewport resize, full-width sidebar)
  - ✅ Add helper functions to `/tests/helpers/integration.js`
- ✅ **Manual Testing**
  - ✅ Run `make test-integration FILE=ai-chat-basic.test.js`
  - ✅ Manually verify all UI interactions work smoothly
- ✅ **Code Quality**
  - ✅ Lint and format all code (`make lint && make format`)
  - ✅ Comment audit - remove redundant comments, keep valuable ones
  - ✅ Replace `forEach` with `for...of` for performance

### Phase 1.5: Business Logic Extraction & Unit Testing

**Goal:** Extract pure business logic from the AI Chat component into testable utility classes and add comprehensive unit tests for the business logic.

**Tasks:** *(Mark completed items with ✅)*
- ✅ Extract Chat History Business Logic (`/lib/chat-history.js`)
  - ✅ Create `ChatHistory` utility class with message management
  - ✅ Message creation with timestamps and validation
  - ✅ Chat history serialization/deserialization with error handling
  - ✅ Input validation and sanitization methods
  - ✅ Limit enforcement (200 message limit from plan)
- ✅ Extract Message Business Logic (`/lib/chat-message-utils.js`)
  - ✅ Create message utility functions (converted from class to individual functions)
  - ✅ Message role validation (user/assistant)
  - ✅ Content sanitization and XSS prevention helpers
  - ✅ Message formatting utilities
- ✅ Refactor AI Chat Component (`/public/components/ai-chat.js`)
  - ✅ Update component to use new utility classes
  - ✅ Keep only UI/DOM manipulation in component
  - ✅ Maintain exact same public API and behavior
- ✅ **Unit Tests for Business Logic**
  - ✅ Create ChatHistory Unit Tests (`/tests/unit/chat-history.test.js`)
    - ✅ Test message creation, serialization, deserialization
    - ✅ Test error handling for malformed data
    - ✅ Test message limit enforcement
    - ✅ Test input validation
  - ✅ Create ChatMessage Unit Tests (`/tests/unit/chat-message-utils.test.js`)
    - ✅ Test message validation and sanitization
    - ✅ Test XSS prevention
    - ✅ Test role validation
- ✅ **Integration Test Updates**
  - ✅ Verify existing integration tests still pass after refactor
  - ✅ No behavior changes should be visible to end users
- ✅ **Quality Assurance**
  - ✅ Run full test suite: `make test-all`
  - ✅ Ensure all linting passes: `make lint`
  - ✅ Verify no regressions in functionality

**Implementation Notes & Pivots:**
- **Class → Functions Conversion**: Initially implemented ChatMessage as a class with static methods, but converted to individual exported functions to follow linter recommendations and improve tree-shaking
- **File Renaming**: Renamed `chat-message.js` to `chat-message-utils.js` to better reflect the functional approach
- **Comment Cleanup**: Removed redundant comments while preserving valuable context about security decisions
- **88 Unit Tests**: Created comprehensive test coverage with 43 ChatHistory tests + 45 ChatMessage function tests

### Phase 2: Server-Side AI Integration

**Goal:** Build the backend infrastructure to handle AI chat requests. Create the OpenRouter client, API route, and configuration files needed for AI conversations.

**Tasks:** *(Mark completed items with ✅)*
- Create AI Configuration (`/lib/ai-config.js`)
  - Define OpenRouter base URL, model name, site info constants
  - Make model easily configurable
- Create System Prompt (`/lib/ai-system-prompt.js`)
  - Write system prompt as JS constant export
  - Focus on database visualization and analysis assistance
- Install OpenAI Package
  - Run `bun add openai` to install OpenAI SDK
- Create OpenRouter Client (`/lib/openrouter-client.js`)
  - Use OpenAI SDK configured for OpenRouter endpoints
  - Configure base URL to `https://openrouter.ai/api/v1`
  - Handle authentication with OPENROUTER_API_KEY environment variable
  - Include required headers (HTTP-Referer, X-Title) in default headers
  - Export `createChatCompletion()` method that uses OpenAI SDK
- Create Chat API Route (`/routes/chat.js`)
  - Follow pattern from `/routes/query.js`
  - **Security**: Validate and sanitize input (message required, chatHistory optional)
  - **Security**: Limit message length (e.g., 4000 characters max)
  - **Security**: Limit chat history size (max 300 messages in request)
  - Build messages array with system prompt
  - Call OpenRouter client
  - Return response with success/error handling
- Add Route to Server (`/index.js`)
  - Import handleChat function
  - Add `"/api/chat": { POST: handleChat }` to routes object
- **Unit Tests for Phase 2**
  - Create OpenRouter Client Unit Tests (`/tests/unit/openrouter-client.test.js`)
    - Test client initialization with/without API key
    - Test createChatCompletion method (mock fetch)
    - Test error handling for API failures
  - Create Chat Route Unit Tests (`/tests/unit/chat-route.test.js`)
    - Test successful chat completion
    - Test missing message validation
    - Test malformed input handling
    - Test OpenRouter API error handling
- **Manual API Testing**
  - Test API route with curl: `curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"Hello"}'`
  - Verify OpenRouter API key is set (check environment variable exists, don't look at value)
  - Test error handling for missing/invalid inputs with curl
- **Run Tests**
  - Unit tests pass: `make test-unit`

### Phase 3: Frontend Chat Logic

**Goal:** Replace the echo functionality with real AI chat. Connect the frontend to the backend API and handle the complete chat flow including loading states and error handling.

**Tasks:** *(Mark completed items with ✅)*
- Replace Echo with AI Integration
  - Modify `sendMessage()` method to call `/api/chat` instead of echoing
  - Update message handling to work with AI responses
  - Keep existing message rendering and persistence logic
- Add Message Handling to Component
  - Implement `addMessage()` to append messages to chat
  - **Security**: Implement `renderMessage()` with XSS prevention (escape HTML, use textContent)
  - Add loading states and typing indicators
  - Handle API errors gracefully
- Add Chat History Persistence
  - Implement `saveChatHistory()` using sessionStorage (persists refreshes, not browser sessions)
  - Implement `loadChatHistory()` to restore on page load
  - Load and render existing messages on component creation
  - **Security**: Validate loaded chat history structure before rendering
- Add Input Handling
  - Wire up send button click handler
  - Add Enter key submission (Shift+Enter for new line)
  - Clear input after sending
  - Disable input while loading
- **Unit Tests for Phase 3**
  - Create AI Chat Component Unit Tests (`/tests/unit/ai-chat.test.js`)
    - Test component initialization
    - Test message rendering
    - Test chat history save/load
    - Test show/hide functionality
    - Test API integration (mock fetch)
- **Integration Tests for Phase 3** (update existing file) *(Follow `/TESTING.md` - set up response listeners BEFORE triggering actions, avoid force clicks)*
  - **Regular Integration Tests** (majority) - Use Playwright route interception to mock `/api/chat` calls
    - Mock API responses at network level with `page.route('/api/chat', ...)`
    - Test complete UI flow with predictable responses (no external API costs)
    - Test error scenarios by mocking different API failure responses
    - Test loading states and message rendering
    - Set up response listeners BEFORE triggering actions
  - **Expensive Integration Tests** - Tag with `@expensive` for real OpenRouter API calls
    - One or two tests that verify actual API integration works
    - Test real AI response handling end-to-end
    - Only run manually or in special CI scenarios
- **Make Commands**
  - Add `test-integration-expensive` target for `@expensive` tagged tests
  - Regular `test-integration` runs regular tests with mocked APIs
- **Run Tests**
  - Unit tests pass: `make test-unit`
  - Regular integration tests pass: `make test-integration`
  - Expensive tests pass: `make test-integration-expensive` (when API key available)

### Phase 4: Error Handling & Polish

**Goal:** Add proper error handling, improve the user experience with polish features, and optimize performance. Make the chat feel production-ready.

**Tasks:** *(Mark completed items with ✅)*
- Error States
  - Handle network connection failures
  - Handle OpenRouter rate limiting
  - Handle API key validation errors
  - Show user-friendly error messages
- UX Improvements
  - Add typing indicators while AI responds
  - Add message timestamps
  - Add clear chat button
  - Implement keyboard shortcuts (Enter to send)
  - Auto-scroll to newest messages
- Performance Considerations
  - **Truncation Strategy**: Limit chat history to last 200 messages for both storage and API calls
    - Keep system prompt + last 200 user/assistant messages (100 pairs)
    - sessionStorage stores same 200 messages that model sees (no extra storage)
    - Uses ~25-50% of 200k token context window, leaving room for complex responses
    - When hitting 200 message limit, remove oldest messages from both storage and API calls
    - Implement message trimming in chat route before calling OpenRouter
  - Add debounced input validation
- **Final Unit Tests**
  - Add error handling tests to existing unit test files
  - Test performance optimizations
  - Test UX improvements (timestamps, clear button, etc.)
- **Final Integration Tests** *(Follow `/TESTING.md` patterns for reliable tests)*
  - Update integration tests to cover error states
  - Test keyboard shortcuts end-to-end
  - Test full user journey with all polish features
- **Final Testing & Quality**
  - Run full test suite: `make test-all`
  - Run linting: `make lint`
  - Run formatting: `make format`
  - Manual testing of complete feature with curl for API validation
  - Test all error scenarios manually

## Key Files to Reference

**Component Structure**: `/public/components/schema.js`
**CSS Patterns**: Look for `.schema-sidebar` styles in `/public/style.css`
**API Route Patterns**: `/routes/query.js` and `/routes/schema.js`
**App Integration**: How schema component is integrated in `/public/app.js`
**Testing Patterns**: Existing tests in `/tests/integration/` and `/tests/unit/`

## File Structure Summary

```
/lib/
  ai-config.js           # AI configuration constants
  ai-system-prompt.js    # System prompt for AI
  openrouter-client.js   # OpenRouter API client

/routes/
  chat.js               # Chat API endpoint

/public/components/
  ai-chat.js            # AI chat component

/tests/unit/
  ai-chat.test.js       # Unit tests for AI functionality
  chat-route.test.js    # API route tests

/tests/integration/
  ai-chat.test.js       # End-to-end chat tests
```

## Environment Setup

Ensure `OPENROUTER_API_KEY` is set in your environment (verify the variable exists, don't check the value).

## Make Commands to Run

- `make test-unit` - Run unit tests
- `make test-integration` - Run all integration tests
- `make test-integration FILE=ai-chat-basic.test.js` - Run specific integration test file
- `make lint` - Check code style
- `make format` - Format code

## Future Enhancements (Not in Current Plan)

- AI tool calling for widget creation/editing
- File upload support for data analysis
- SQL query generation assistance
- Chart recommendation based on data