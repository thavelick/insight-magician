# Integration Test Plan for Insight Magician

## Overview

This plan outlines comprehensive integration testing for the Insight Magician database dashboard application. The tests are prioritized from critical happy path scenarios to edge cases, ensuring robust coverage of the core functionality.
## Process
After each phase add ✅ emojis to things that are done

## Application Architecture

The application consists of:
- **Backend**: Bun.js server with REST API endpoints
- **Frontend**: Vanilla JavaScript SPA with D3.js visualizations
- **Database**: SQLite file upload and query system
- **Components**: Upload, Schema viewer, and Widget (query/visualization) components

## Test Structure

Tests are organized into three phases:

1. **Phase 1: Critical Happy Path** - Core functionality that must work
2. **Phase 2: Extended Happy Path** - Important but secondary features
3. **Phase 3: Edge Cases & Error Handling** - Robustness and security

**Testing Philosophy**: 
- Focus exclusively on user-visible functionality. Test what users can see, interact with, and experience. Avoid testing internal implementation details like IDs, storage mechanisms, or internal state that users cannot directly observe.
- **Test through the UI, not direct API calls.** API endpoints may be exercised during testing, but always through user interactions (clicking upload, entering queries, etc.), not direct HTTP requests.
- **If tests reveal broken functionality, stop and ask the user before fixing anything.** We are testing existing functionality, not debugging or improving it yet.
- **Avoid premature abstraction**: Start with simple, direct test code. Only create utility functions if you find yourself repeating the same code multiple times across different test files.

---

## Phase 1: Critical Happy Path Tests

### 1.1 Test Setup ✅
**Priority: CRITICAL**

**Setup Tasks:**
- ✅ Create `tests/fixtures/sql/` directory structure
- ✅ Create `basic.sql` with simple users table (id, name, email) and ~10 rows of INSERT statements
- ✅ Create `empty.sql` (empty file for creating valid SQLite with no tables)
- ✅ Tests will populate SQLite databases as needed using these .sql files

### 1.2 File Upload & Validation (`upload-validation.spec.js`)
**Priority: CRITICAL**

- Test upload functionality with valid SQLite files
- Verify unique filename generation logic
- Confirm file validation (SQLite format check)
- Test file size limit enforcement

**Test Cases:**
- ✅ `should accept valid SQLite files and generate unique filename`
- ✅ `should validate SQLite file format using our validation logic`
- ✅ `should enforce file size limits correctly`
- ✅ `should return proper upload response format`

### 1.3 Schema Extraction (`schema-extraction.spec.js`)
**Priority: CRITICAL**

- Test DatabaseManager schema extraction logic
- Verify schema response format matches frontend expectations
- Test error handling when database is corrupted/inaccessible

**Test Cases:**
- ✅ `should extract and format schema correctly`
- ✅ `should handle databases with no tables gracefully`
- ✅ `should return proper error when database file missing`

### 1.4 Query Processing & Pagination (`query-processing.spec.js`)
**Priority: CRITICAL**

- Test query execution with our pagination wrapper
- Verify SQL validation logic prevents dangerous queries
- Test result formatting (columns, rows array format)
- Test pagination metadata calculation

**Test Cases:**
- ✅ `should execute queries and format results correctly`
- ✅ `should implement pagination with proper metadata`
- ✅ `should validate and sanitize pagination parameters`
- ✅ `should calculate total pages and hasMore correctly`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 1.5 Widget State Management (`widget-state.spec.js`)
**Priority: CRITICAL**

- Test widget creation and deletion in frontend
- Test widget flipping between edit and view modes
- Verify sessionStorage persistence of database selection
- Test basic query execution through widget UI
- Test basic chart rendering (without testing D3 internals)

**Test Cases:**
- ✅ `should create and delete widgets properly`
- ✅ `should flip between edit and view modes correctly`
- ✅ `should persist selected database across page reload`
- ✅ `should execute queries through widget interface`
- ✅ `should render basic chart for graph widgets`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 5 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

---

## Phase 2: Extended Happy Path Tests

### 2.1 Pagination Edge Cases (`pagination-advanced.spec.js`) ✅
**Priority: HIGH**

- Test different page sizes and boundary conditions
- Verify count query fallback logic when COUNT(*) fails
- Test pagination with empty result sets
- Test our total pages calculation logic

**Test Cases:**
- ✅ `should handle different page sizes within limits`
- ✅ `should fallback to counting all results when COUNT query fails`
- ✅ `should handle pagination of empty result sets`
- ✅ `should calculate pagination metadata correctly for edge cases`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 2.2 Multiple Widget Management (`multi-widget.spec.js`) ✅
**Priority: HIGH**

- Test multiple widgets on dashboard simultaneously
- Test widget editing and state updates
- Test widget deletion and cleanup
- Verify widgets operate independently

**Test Cases:**
- ✅ `should create multiple widgets on dashboard`
- ✅ `should update individual widget states independently`
- ✅ `should handle widget deletion without affecting others`
- ✅ `should maintain widget functionality when multiple widgets exist`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 2.3 Session Persistence (`session-persistence.spec.js`) ✅
**Priority: HIGH**

- Test database selection persists across page reload
- Test component state restoration after page reload
- Test widget state persistence and restoration
- Test handling multiple database uploads in session

**Test Cases:**
- ✅ `should remember selected database after page reload`
- ✅ `should restore schema display after reload`
- ✅ `should restore widget states and data after reload`
- ✅ `should handle switching between uploaded databases`
- ✅ `should reset interface when new database uploaded`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 5 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

**Note**: Tests focus on user-visible behavior, not internal state like widget IDs or storage mechanisms.

### 2.4 Widget Resizing Controls (`widget-resizing.spec.js`) ✅
**Priority: HIGH**

- Test widget size controls (width/height +/- buttons)
- Test size limits (1-4 for both dimensions)
- Test visual feedback when resizing
- Test size persistence across page reload

**Test Cases:**
- ✅ `should increase and decrease widget width within limits`
- ✅ `should increase and decrease widget height within limits`
- ✅ `should hide resize buttons at size limits`
- ✅ `should show visual feedback when size changes`
- ✅ `should persist widget sizes after page reload`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 5 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate (CSS grid properties are user-visible layout changes)

### 2.5 Widget Configuration (`widget-config.spec.js`) ✅
**Priority: HIGH**

- Test widget title editing and display
- Test widget type switching (data-table vs graph)
- Test chart function input for graph widgets
- Test widget settings persistence

**Test Cases:**
- ✅ `should update widget title and display in header`
- ✅ `should switch between data table and graph widget types`
- ✅ `should show chart function input only for graph widgets`
- ✅ `should persist widget configuration across sessions`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 2.6 Upload Area Management (`upload-area.spec.js`) ✅
**Priority: HIGH**

- Test upload area hiding when first widget is added
- Test upload area showing when last widget is deleted
- Test toggle upload button functionality
- Test upload success/error message display

**Test Cases:**
- ✅ `should hide upload area after adding first widget`
- ✅ `should show upload area again when no widgets remain`
- ✅ `should toggle upload area visibility with toggle button`
- ✅ `should display upload success and error messages`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 2.7 Schema Sidebar (`schema-sidebar.spec.js`) ✅
**Priority: HIGH**

- Test schema sidebar show/hide functionality
- Test schema display after database load
- Test view schema button visibility
- Test schema content formatting

**Test Cases:**
- ✅ `should show schema sidebar after database upload`
- ✅ `should hide and show schema sidebar with view schema button`
- ✅ `should display schema with proper table and column information`
- ✅ `should hide view schema button when no database is loaded`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

---

## Phase 3: Edge Cases & Error Handling Tests

### 3.1 File Upload Security ✅
**Priority: MEDIUM**

- ✅ Test our file size limit enforcement (MAX_FILE_SIZE)
- ✅ Test our SQLite format validation logic

**Test Cases:**
- ✅ `should reject files exceeding our 100MB limit` (covered in upload.spec.js:93)
- ✅ `should reject non-SQLite files with proper error message` (covered in upload.spec.js:76)

**Note:** Already implemented in existing upload.spec.js integration tests and upload.spec.js unit tests.

### 3.2 Input Validation Security (`input-validation.spec.js`) ✅
**Priority: MEDIUM**

- ✅ Test filename validation in upload and query functionality
- ✅ Test our specific path traversal prevention logic
- ✅ Test our SQL validation (validateSql function)
- ✅ Test error response consistency

**Test Cases:**
- ✅ `should block filenames with path traversal characters in schema endpoint`
- ✅ `should prevent directory traversal in query endpoint`
- ✅ `should validate SQL queries using validation logic`
- ✅ `should return consistent error response format`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate

### 3.3 Database Connection Errors (`connection-errors.spec.js`) ✅
**Priority: MEDIUM**

- ✅ Test missing file scenarios
- ✅ Test corrupted database file handling

**Test Cases:**
- ✅ `should handle missing database files gracefully` (moved to unit tests)
- ✅ `should handle schema extraction failures`

**Post-implementation tasks:**
- ✅ Eliminate duplication between test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate
- ✅ Audit comments to remove redundant ones that just repeat code

### 3.4 Chart Function Validation (`chart-function-validation.spec.js`) ✅
**Priority: MEDIUM**

- ✅ Test chart function syntax validation
- ✅ Test dangerous code pattern detection (infinite loops)
- ✅ Test chart function execution error handling
- ✅ Test chart fallback display when function fails

**Test Cases:**
- ✅ `should validate JavaScript syntax in chart functions`
- ✅ `should reject dangerous patterns like while loops`
- ✅ `should show helpful error messages when chart function fails`
- ✅ `should display data preview when chart rendering fails`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 4 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate
- ✅ Audit comments to remove redundant ones that just repeat code

### 3.5 Widget Confirmation Dialogs (`widget-confirmations.spec.js`) ✅
**Priority: LOW**

- ✅ Test widget deletion confirmation dialog
- ✅ Test widget type switching confirmation when losing chart function
- ✅ Test confirmation dialog responses (accept/cancel)

**Test Cases:**
- ✅ `should show confirmation before deleting widget`
- ✅ `should warn before switching from graph to table with existing chart function`
- ✅ `should respect user choice in confirmation dialogs`

**Post-implementation tasks:**
- ✅ Eliminate duplication between all 3 test cases (helper functions, setup/cleanup)
- ✅ Consider moving non-UI logic to unit tests if appropriate
- ✅ Audit comments to remove redundant ones that just repeat code

### 3.6 User-Facing Error Messages (`user-error-messages.spec.js`)
**Priority: LOW**

- Test that users see helpful error messages in the UI
- Test error scenarios are handled gracefully in frontend

**Test Cases:**
- `should show helpful error messages when upload fails`
- `should display clear errors when queries fail`

**Post-implementation tasks:**
- Eliminate duplication between all 2 test cases (helper functions, setup/cleanup)
- Consider moving non-UI logic to unit tests if appropriate
- Audit comments to remove redundant ones that just repeat code

---

## Test Data & Fixtures

### Required Test Databases

1. **`basic.sql`** - Simple database schema and data
   - CREATE TABLE users (id, name, email) with ~10 INSERT statements
   - Tests basic schema extraction and query execution

2. **`pagination.sql`** - Database for testing pagination logic
   - CREATE TABLE items with 150+ INSERT statements
   - Tests our pagination calculations and LIMIT/OFFSET logic

3. **`empty.sql`** - Empty file
   - Creates valid SQLite file with no tables when executed
   - Tests schema extraction edge case

4. **Invalid test files for validation testing**
   - `test-invalid.txt` - Non-SQLite file for format validation
   - `test-oversized.db` - File exceeding our 100MB limit
   - `test-corrupt.db` - Corrupted SQLite file


---

## Test Configuration

### Test Setup Notes

- **Test infrastructure**: Playwright and test runners are already configured - no additional setup needed
- **Browser testing**: Focus on single browser (Chromium) testing for now to keep tests simple and fast
- **Mock utilities**: Create simple, inline mocks as needed - no centralized utility framework required
- **Test fixtures**: Create a dedicated `tests/fixtures/sql/` directory for test SQL files
- **State cleanup**: Clear sessionStorage and localStorage between tests using Playwright's standard cleanup hooks
- **File cleanup**: Always clean up uploaded files from the `uploads/` directory in test afterEach hooks to prevent test pollution
- **Test execution**: Run `make test-integration` after implementing each test file to verify it works
- **Code quality**: Run `make check` after completing tests to ensure formatting and linting standards


