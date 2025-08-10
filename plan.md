# Widget Customization Plan

## Overview
Add more customization options to widgets to improve user experience and data presentation.

## Features to Implement

### 1. Field String Humanizer
Create a utility function that converts database field names to human-readable labels:
- **snake_case** → "Snake Case" (user_id → "User ID")
- **camelCase** → "Camel Case" (firstName → "First Name") 
- **PascalCase** → "Pascal Case" (UserName → "User Name")
- **kebab-case** → "Kebab Case" (created-at → "Created At")
- Handle common abbreviations (id → "ID", url → "URL", etc.)

### 2. Widget Title Customization
Add ability for users to set custom titles for widgets:
- Add title input field to the back/settings panel of each widget
- Store title in widget data structure
- Display custom title in widget header instead of generic "Widget" text
- Default to humanized version of primary table/query if no custom title set

### 3. Widget Type Selection
Add dropdown for widget display type:
- Start with single option: "Data Table" (or "Table View")
- Prepare structure for future widget types (charts, cards, etc.)
- Store widget type in data structure
- Apply different rendering logic based on selected type

## Implementation Steps

### Phase 1: Field String Humanizer
- [x] Create field string humanizer utility function in lib/
- [x] Handle snake_case conversion (user_id -> User ID)
- [x] Handle camelCase conversion (firstName -> First Name)
- [x] Handle PascalCase conversion (UserName -> User Name)
- [x] Handle kebab-case conversion (created-at -> Created At)
- [x] Handle common abbreviations (id -> ID, url -> URL, etc.)
- [x] Write unit tests for humanizer function

### Phase 2: Data Structure Updates
- [x] Add `title` field to widget constructor (string, defaults to empty)
- [x] Add `widgetType` field to widget constructor (string, defaults to 'data-table')
- [x] Update widget's `getData()` method to include title and widgetType in serialization
- [x] Update widget's `loadData()` method to restore title and widgetType from saved data
- [x] Update WidgetComponent constructor to accept title and widgetType parameters
- [x] Modify app.js `loadWidgets()` to pass title and widgetType when creating widgets
- [x] Update app.js `saveWidgets()` to persist the new fields
- [x] Ensure backward compatibility - handle widgets without these fields gracefully

### Phase 3: UI Enhancements
- [x] Add title input field to widget back panel HTML template
- [x] Add widget type dropdown to widget back panel HTML template
- [x] Populate widget type dropdown with 'Data Table' option (and setup for future types)
- [x] Wire up title input change handler to update widget.title property
- [x] Wire up widget type dropdown change handler to update widget.widgetType property
- [x] Update back panel to show current title and widgetType values when flipped
- [x] Add CSS styling for new form elements (consistent with existing back panel style)
- [x] Ensure form elements are accessible (labels, proper focus handling)

### Phase 4: Integration & Testing
- [x] Apply humanization and custom titles
- [x] Import and use humanizer for table column headers
- [x] Display custom widget title in header instead of 'Widget'
- [x] Add fallback to humanized query/table name if no custom title
- [x] Test with various field naming conventions

## Technical Notes
- Keep humanizer function pure and testable
- Ensure backward compatibility with existing widgets
- Consider performance impact of humanization on large result sets
- Plan for future widget types in the data structure