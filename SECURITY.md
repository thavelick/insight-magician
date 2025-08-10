# Security Considerations

## Overview

Insight Magician is a SQLite database visualization tool that allows users to write custom D3.js chart functions to visualize their query results. This document outlines important security considerations, particularly around the graph widget feature.

## Current Security Model

### SQLite Database Processing
- **Database files are processed locally** - uploaded files are stored temporarily on the server
- **SQL queries are executed server-side** with basic validation (SELECT-only, no dangerous operations)
- **Query results are returned as JSON** to the client for visualization

### Graph Widget JavaScript Execution

⚠️ **IMPORTANT: The graph widget feature executes user-provided JavaScript code directly in the browser.**

#### Current Implementation (MVP)
- **Client-side execution**: Chart functions run in the main browser thread
- **No sandboxing**: Full access to DOM, browser APIs, and page context
- **Local storage only**: Chart function code is never sent to the server
- **Basic validation**: JavaScript syntax checking only

## Security Risks

### High Risk
- **Arbitrary Code Execution**: Malicious chart functions can execute any JavaScript code
- **Cross-Site Scripting (XSS)**: Chart functions can inject scripts, steal data, or manipulate the DOM
- **Data Exfiltration**: Chart functions can send query results or other data to external servers
- **Browser API Abuse**: Access to localStorage, sessionStorage, geolocation, camera, etc.

### Medium Risk
- **Denial of Service**: Infinite loops or excessive memory usage can crash the browser
- **UI Manipulation**: Chart functions can modify other widgets or the entire application interface

### Low Risk
- **Server-side Impact**: Chart functions don't run on the server, so server compromise risk is minimal

## Mitigations in Place

### Current MVP Mitigations
- **Syntax validation**: Basic JavaScript parsing before execution
- **Error isolation**: Try-catch blocks prevent widget crashes
- **Client-side only**: Chart code never leaves the user's browser
- **Input sanitization**: Basic validation on chart function input
- **Clear error reporting**: Line/column numbers for debugging

### SQL Query Protection
- **SELECT-only**: Only SELECT statements allowed
- **No multiple statements**: Semicolons are blocked
- **No dangerous operations**: DROP, DELETE, UPDATE, etc. are blocked
- **Pagination handled server-side**: LIMIT/OFFSET are blocked and handled automatically

## Recommended Usage

### Safe Usage Scenarios
- **Personal use**: Running on your own machine with your own data
- **Trusted environments**: Internal corporate tools where users are trusted
- **Educational settings**: Learning D3.js with known-safe example code

### Risky Usage Scenarios
- **Public-facing applications**: Never deploy with chart widgets enabled for untrusted users
- **Shared hosting**: Risk of affecting other users if chart functions consume excessive resources
- **Sensitive data**: Avoid using with confidential data that could be exfiltrated

## Future Security Hardening

### Planned Improvements
- **Web Worker sandboxing**: Execute chart functions in isolated Web Workers
- **Content Security Policy (CSP)**: Restrict script execution and network access
- **Function whitelisting**: Allow only pre-approved D3.js operations
- **Resource monitoring**: Detect and terminate runaway chart functions
- **Iframe sandboxing**: Execute chart functions in sandboxed iframes

### Advanced Protections
- **Static code analysis**: Parse and validate chart functions before execution
- **Rate limiting**: Throttle chart function execution frequency
- **Memory/CPU limits**: Enforce resource constraints on chart functions
- **Network isolation**: Prevent chart functions from making network requests

## Developer Guidelines

### For Contributors
- Never modify chart execution to run on the server
- Maintain client-side execution model for user privacy
- Add security warnings to documentation
- Consider security impact of any new features

### For Users
- Only run chart functions from trusted sources
- Review chart function code before execution
- Be aware that chart functions have full browser access
- Don't use with sensitive data in shared environments

## Disclosure Policy

If you discover security vulnerabilities in Insight Magician, please:
1. Report them privately via GitHub issues
2. Allow time for fixes before public disclosure
3. Include steps to reproduce the issue
4. Suggest mitigations if possible

## Acknowledgments

This security model prioritizes user privacy (client-side execution) and development velocity (MVP approach) over maximum security. Users should understand the trade-offs and use the tool appropriately for their threat model.

For production deployments with untrusted users, additional sandboxing and security measures are strongly recommended.