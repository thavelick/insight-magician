# Graph Widget MVP Plan

## Overview
Add D3.js-based graph widgets where users can define custom JavaScript functions to create visualizations from their SQL query results.

## Security Considerations ⚠️

### Current MVP Risks (MUST ADDRESS BEFORE PRODUCTION)
- **Arbitrary Code Execution**: User JavaScript runs in main browser thread with full DOM access
- **XSS Vulnerabilities**: Malicious functions could inject scripts or steal data
- **Memory/CPU Attacks**: Infinite loops or excessive memory usage could crash browser
- **Data Exfiltration**: Functions could send query results to external servers

### MVP Mitigations
- Basic JavaScript syntax validation before save
- Function execution in try-catch blocks with timeout
- Error isolation to prevent widget crashes
- Input sanitization on function code

### Future Security Hardening Path
- Web Workers for sandboxed execution
- Content Security Policy restrictions  
- Function whitelisting/code analysis
- Rate limiting and resource monitoring
- Iframe sandbox environment

## Data Format

User functions receive an array of JavaScript objects:
```javascript
[
  { product_name: 'Widget A', sales_amount: 1500, date: '2024-01-15' },
  { product_name: 'Widget B', sales_amount: 2300, date: '2024-01-16' },
  { product_name: 'Gadget C', sales_amount: 800, date: '2024-01-17' }
]
```

## Function Requirements

User functions must:
1. Accept single data parameter
2. Return a valid D3 selection or DOM element
3. Be valid JavaScript syntax
4. Complete within reasonable time limits
5. Use SVG viewBox for responsive sizing (recommended)

Example function:
```javascript
function createChart(data) {
  const svg = d3.select(document.createElement('svg'))
    .attr('viewBox', '0 0 400 300');
  
  // Simple bar chart using object properties
  const maxValue = d3.max(data, d => d.sales_amount);
  
  svg.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * 50)
    .attr('y', d => 300 - (d.sales_amount / maxValue) * 250)
    .attr('width', 40)
    .attr('height', d => (d.sales_amount / maxValue) * 250)
    .attr('fill', 'steelblue');
    
  return svg.node();
}
```

## Implementation Phases

### Phase 1: Foundation Setup
- [ ] Add D3.js dependency to project using `bun add d3`
- [ ] Extend widget data structure with `chartFunction` field
- [ ] Add "Graph" option to widget type dropdown
- [ ] Update serialization/deserialization for new field

### Phase 2: UI Implementation  
- [ ] Add JavaScript function textarea (hidden by default)
- [ ] Show/hide graph code textarea dynamically based on widget type selection
- [ ] Add confirmation dialog when switching from graph to table (warns about code loss)
- [ ] Add basic JavaScript syntax validation (fires on save, not onChange)
- [ ] Wire up change handlers and save functionality
- [ ] Add CSS styling for code textarea (monospace, proper sizing)

### Phase 3: Execution Pipeline
- [ ] Transform SQL result data from columns/rows format to array of objects
- [ ] Implement safe function execution with timeout
- [ ] Validate function return value (DOM element or D3 selection)
- [ ] Add error handling and user feedback
- [ ] Implement graph rendering in widget front panel

### Phase 4: User Experience
- [ ] Add helpful error messages for common issues
- [ ] Create fallback display for failed functions
- [ ] Add loading states during function execution
- [ ] Ensure proper cleanup on widget destroy

### Phase 5: Documentation & Examples
- [ ] Add graph function examples to README
- [ ] Document security considerations
- [ ] Create sample functions for common chart types

## Technical Architecture

### Widget Type Logic
- Data table widgets render HTML tables as before
- Graph widgets execute user function and render returned DOM element

### Dynamic UI Behavior  
- Graph code textarea only appears when "Graph" is selected in dropdown
- When switching from graph to table: confirm dialog warns about code loss
- If user confirms: clear chartFunction and hide textarea
- If user cancels: revert dropdown selection

### Data Transformation
Convert SQL results from existing format to object array:
```javascript
// Current SQL result format (from existing table widgets)
{
  columns: ['category', 'count'],
  rows: [['Electronics', 25], ['Books', 15]]
}

// Transform to object format for graph functions
[
  { category: 'Electronics', count: 25 },
  { category: 'Books', count: 15 }
]
```

### Function Validation Pipeline
1. **Data Transform**: Convert columns/rows to array of objects
2. **Syntax Check**: Use `new Function()` to validate JavaScript
3. **Execution**: Run with timeout and error catching
4. **Return Validation**: Check result is renderable DOM element
5. **Rendering**: Insert into widget DOM safely

### D3.js Integration
- Include D3.js from CDN or bundle
- Ensure D3 is available in global scope for user functions
- Handle D3 selections and DOM elements consistently

## Example Functions for README

### Simple Bar Chart
Query: `SELECT category, count FROM my_table`

Data structure received:
```javascript
[
  { category: 'Electronics', count: 25 },
  { category: 'Books', count: 15 },
  { category: 'Clothing', count: 30 }
]
```

Function:
```javascript
function simpleBar(data) {
  const svg = d3.select(document.createElement('svg'))
    .attr('viewBox', '0 0 400 200');
  
  svg.selectAll('rect')
    .data(data)
    .enter().append('rect')
    .attr('x', (d, i) => i * 50)
    .attr('y', d => 200 - d.count * 5)
    .attr('width', 40)
    .attr('height', d => d.count * 5)
    .attr('fill', 'blue');
    
  return svg.node();
}
```

### Simple Pie Chart  
Query: `SELECT name, value FROM my_table`

Data structure received:
```javascript
[
  { name: 'Product A', value: 100 },
  { name: 'Product B', value: 200 },
  { name: 'Product C', value: 150 }
]
```

Function:
```javascript
function simplePie(data) {
  const svg = d3.select(document.createElement('svg'))
    .attr('viewBox', '0 0 200 200');
    
  const pie = d3.pie().value(d => d.value);
  const arc = d3.arc().innerRadius(30).outerRadius(80);
  
  svg.append('g')
    .attr('transform', 'translate(100,100)')
    .selectAll('path')
    .data(pie(data))
    .enter().append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => ['red', 'blue', 'green'][i]);
    
  return svg.node();
}
```

## Success Criteria

- [ ] Users can select "Graph" widget type
- [ ] JavaScript function textarea appears and validates syntax
- [ ] Valid functions execute and render D3 charts
- [ ] Error handling prevents crashes from bad functions
- [ ] Security risks are documented for future mitigation
- [ ] README includes working examples
- [ ] All existing functionality remains intact

## Future Enhancements

- **Security**: Web Worker sandboxing, CSP policies
- **UX**: Syntax highlighting, autocomplete, function templates
- **Performance**: Function caching, lazy D3 loading
- **Features**: Chart export, responsive sizing, themes