# Integration Testing Guidelines

## Before You Start

**Read the code you're testing** - Check the actual implementation to understand:
- What CSS classes and selectors exist
- How timing works (animations, timeouts)
- What the user actually sees and interacts with

**Review existing integration tests** - Look at similar test files to understand:
- Established patterns and helper functions
- How similar functionality is tested
- Common setup and cleanup approaches

## Key Patterns

### 1. Set up response listeners BEFORE triggering actions
```javascript
// ❌ Race condition
await uploadFileViaUI(page, testDbPath);
const response = page.waitForResponse(url => url.includes('/api/upload'));

// ✅ No race condition
const responsePromise = page.waitForResponse(url => url.includes('/api/upload'));
await uploadFileViaUI(page, testDbPath);
const response = await responsePromise;
```

### 2. Never use `waitForTimeout` - wait for conditions
```javascript
// ❌ Flaky and slow
await page.waitForTimeout(1500);

// ✅ Fast and reliable
await page.waitForSelector(".element", { state: "hidden" });
```

### 3. Create helper functions early
Extract common patterns to `../helpers/integration.js`:
```javascript
async function setupDatabaseWithUpload(page, fixtureName = "basic") { }
async function addWidget(page) { }
```

### 4. Use Makefile patterns
```bash
make test-integration FILE=specific-test.spec.js  # Run one file
make test-integration                             # Run all integration tests
make format && make lint                          # Before commit
```

### 5. Follow plan.md
- Update checkmarks as you complete sections
- The "Post-implementation tasks" are real - do the duplication audit and comment audit!
- Test your tests: `make test-integration FILE=your-file.spec.js`