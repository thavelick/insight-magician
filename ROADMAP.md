# Roadmap

This document outlines potential future enhancements for Insight Magician's graph widget feature.

## Security Hardening

**Priority: High** - Required for production deployments with untrusted users

### Web Worker Sandboxing
- Execute chart functions in isolated Web Workers
- Prevent access to main thread DOM and browser APIs
- Enable safe execution of untrusted code

### Content Security Policy (CSP)
- Restrict script execution and network access
- Prevent chart functions from loading external resources
- Block inline script injection

### Function Analysis & Whitelisting
- Static code analysis to validate chart functions
- Whitelist approved D3.js operations only
- Block dangerous JavaScript constructs beyond current loop detection

### Resource Monitoring
- Rate limiting on chart function execution frequency
- Memory and CPU usage monitoring
- Automatic termination of runaway functions

### Iframe Sandboxing
- Execute chart functions in sandboxed iframes
- Additional layer of isolation from main application

## User Experience

**Priority: Medium** - Quality of life improvements for developers

### Enhanced Code Editor
- Syntax highlighting for JavaScript
- Autocomplete for D3.js methods and properties
- Line numbers and error highlighting
- Code folding and better indentation

### Function Templates
- Pre-built chart function templates (bar, pie, line, etc.)
- Copy-paste examples for common patterns
- Interactive function builder/wizard

### Improved Error Handling
- Line-specific error highlighting in code editor
- More detailed error explanations
- Inline help and documentation tooltips

## Performance & Features

**Priority: Low** - Nice-to-have enhancements

### Performance Optimizations
- Function caching to avoid re-execution on identical data
- Lazy loading of D3.js library (only when graph widgets are used)
- Optimized data transformation pipeline

### Chart Export
- Export charts as PNG, SVG, or PDF files
- Copy chart images to clipboard
- Print-friendly chart formatting

### Enhanced Styling
- Chart themes and color palettes
- Responsive sizing improvements
- Animation and transition presets

### Advanced Features
- Data filtering UI for charts
- Chart interaction events (click, hover callbacks)
- Multi-chart dashboards and linking

## Implementation Notes

### Security Model Trade-offs
The current MVP prioritizes:
- **User Privacy**: Client-side execution keeps data local
- **Development Velocity**: Simple implementation without sandboxing
- **Flexibility**: Full D3.js access for maximum chart capabilities

Future security hardening will require careful balance between safety and functionality.

### Backward Compatibility
All enhancements should maintain compatibility with existing chart functions where possible. Breaking changes should be clearly documented and provide migration paths.

---

**Note**: This roadmap represents potential future directions. Implementation depends on user feedback, security requirements, and development priorities.