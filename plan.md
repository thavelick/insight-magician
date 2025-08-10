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
- [x] Add D3.js dependency to project using `bun add d3`
- [x] Extend widget data structure with `chartFunction` field
- [x] Add "Graph" option to widget type dropdown
- [x] Update serialization/deserialization for new field

### Phase 2: UI Implementation  
- [x] Add JavaScript function textarea (hidden by default)
- [x] Show/hide graph code textarea dynamically based on widget type selection
- [x] Add confirmation dialog when switching from graph to table (warns about code loss)
- [x] Add basic JavaScript syntax validation (fires on save, not onChange)
- [x] Wire up change handlers and save functionality
- [x] Add CSS styling for code textarea (monospace, proper sizing)

### Phase 3: Execution Pipeline
- [x] Transform SQL result data from columns/rows format to array of objects
- [x] Implement safe function execution with timeout
- [x] Validate function return value (DOM element or D3 selection)
- [x] Add error handling and user feedback
- [x] Implement graph rendering in widget front panel

### Phase 4: User Experience
- [x] Add helpful error messages for common issues
- [x] Create fallback display for failed functions
- [x] Add loading states during function execution
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

## Appendix: Working Example

### Test Query (Northwind Database)
```sql
SELECT 
    cu.Country as country,
    COUNT(o.OrderID) as order_count
FROM Customers cu
JOIN Orders o ON cu.CustomerID = o.CustomerID
WHERE cu.Country IS NOT NULL AND cu.Country != ''
GROUP BY cu.Country
ORDER BY order_count DESC
```

### Test Chart Function (Interactive Pie Chart)
```javascript
function createChart(data, svg, d3, width, height) {
  // Take top 6 countries and group the rest as "Others"
  const topCountries = data.slice(0, 6);
  const otherCountries = data.slice(6);

  let chartData = [...topCountries];

  if (otherCountries.length > 0) {
    const othersTotal = otherCountries.reduce((sum, d) => sum + d.order_count, 0);
    chartData.push({
      country: 'Others',
      order_count: othersTotal
    });
  }

  const radius = Math.min(width, height) / 2 - 40;

  // Colors with "Others" as gray
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#95A5A6'];
  const color = d3.scaleOrdinal().range(colors);

  const pie = d3.pie()
    .value(d => d.order_count)
    .sort(null)
    .padAngle(0.02);

  const arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius)
    .cornerRadius(2);

  const arcHover = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius + 6)
    .cornerRadius(2);

  // Create gradients
  const defs = svg.append('defs');
  chartData.forEach((d, i) => {
    const gradient = defs.append('radialGradient')
      .attr('id', `gradient-${i}`)
      .attr('cx', '30%')
      .attr('cy', '30%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d3.color(color(i)).brighter(0.3));
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', color(i));
  });

  const g = svg.append('g')
    .attr('transform', `translate(${width/2}, ${height/2})`);

  const arcs = g.selectAll('.arc')
    .data(pie(chartData))
    .enter().append('g')
    .attr('class', 'arc');

  // Pie slices with hover effects
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => `url(#gradient-${i})`)
    .attr('stroke', 'white')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('d', arcHover);
        
      centerText.text(`${d.data.country}: ${d.data.order_count}`);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('d', arc);
        
      centerText.text('Orders by Country');
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attrTween('d', function(d) {
      const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
      return function(t) { return arc(interpolate(t)); };
    });

  // Labels for all slices
  arcs.append('text')
    .attr('transform', d => {
      const pos = arc.centroid(d);
      pos[0] *= 1.8;
      pos[1] *= 1.8;
      return `translate(${pos})`;
    })
    .attr('text-anchor', d => {
      const pos = arc.centroid(d);
      return pos[0] > 0 ? 'start' : 'end';
    })
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .style('opacity', 0)
    .text(d => d.data.country)
    .transition()
    .duration(500)
    .delay(1000)
    .style('opacity', 1);

  // Center text
  const centerText = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#333')
    .text('Orders by Country');

  return svg;
}
```

This example creates an interactive donut chart showing order counts by country from the Northwind sample database. Features include:

- **Data grouping**: Shows top 6 countries plus "Others" for better readability
- **Interactive hover effects**: Slices expand and show details on hover
- **Gradient fills**: Beautiful radial gradients for each slice
- **Smooth animations**: Slices animate in sequentially
- **Responsive design**: Scales with widget size using viewBox
- **Modern API**: Clean function signature with explicit parameters

The chart function receives `data` (array of objects), `svg` (pre-configured D3 selection), `d3` (D3.js library), `width` and `height` (chart dimensions), and returns the modified svg element.