# Graph Widget Examples

This folder contains example D3.js chart functions for the graph widget feature.

## Setup

1. Create a sample database:
   ```bash
   sqlite3 sample.db < sample-database.sql
   ```

2. Upload `sample.db` to the Insight Magician application

3. Copy and paste the JavaScript functions from the examples into graph widgets

## Available Examples

- **[simple-bar-chart.md](simple-bar-chart.md)** - Basic bar chart with auto-scaling
- **[simple-pie-chart.md](simple-pie-chart.md)** - Basic pie chart with labels  
- **[simple-line-chart.md](simple-line-chart.md)** - Time series line chart with axes
- **[interactive-pie-chart.md](interactive-pie-chart.md)** - Advanced donut chart with hover effects and animations

## Function Signature

All chart functions receive these parameters:

```javascript
function createChart(data, svg, d3, width, height) {
  // data: Array of objects from your SQL query
  // svg: Pre-configured D3 selection with viewBox
  // d3: D3.js library (version 7)
  // width: Chart width (400px)
  // height: Chart height (300px)
  
  // Your visualization code here...
  
  return svg; // Return the svg selection or svg.node()
}
```

## Tips

- Always return the `svg` element or `svg.node()`
- Use `viewBox` for responsive sizing (already set on the svg)
- Keep functions simple for better debugging
- Check the browser console for error details
- Use the data preview in error states to understand your data structure