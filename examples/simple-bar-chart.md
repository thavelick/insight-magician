# Simple Bar Chart

A basic bar chart showing category counts.

## SQL Query

```sql
SELECT category, count FROM sales
```

## Expected Data Structure

Your function will receive:
```javascript
[
  { category: 'Electronics', count: 25 },
  { category: 'Books', count: 15 },
  { category: 'Clothing', count: 30 },
  { category: 'Home & Garden', count: 12 },
  { category: 'Sports', count: 8 }
]
```

## JavaScript Function

```javascript
function createChart(data, svg, d3, width, height) {
  // Simple bar chart
  const maxValue = d3.max(data, d => d.count);
  const barWidth = width / data.length - 10;
  
  svg.selectAll('rect')
    .data(data)
    .enter().append('rect')
    .attr('x', (d, i) => i * (barWidth + 10) + 5)
    .attr('y', d => height - (d.count / maxValue) * (height - 40))
    .attr('width', barWidth)
    .attr('height', d => (d.count / maxValue) * (height - 40))
    .attr('fill', 'steelblue');
  
  // Add labels
  svg.selectAll('text')
    .data(data)
    .enter().append('text')
    .attr('x', (d, i) => i * (barWidth + 10) + barWidth/2 + 5)
    .attr('y', height - 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(d => d.category);
    
  return svg;
}
```

## Features

- Auto-scales bars based on maximum value
- Shows category labels at bottom
- Responsive bar width based on data length