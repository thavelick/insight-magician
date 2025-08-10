# Simple Pie Chart

A basic pie chart showing product values.

## SQL Query

```sql
SELECT name, value FROM products
```

## Expected Data Structure

Your function will receive:
```javascript
[
  { name: 'Product A', value: 100 },
  { name: 'Product B', value: 200 },
  { name: 'Product C', value: 150 },
  { name: 'Product D', value: 75 },
  { name: 'Product E', value: 120 }
]
```

## JavaScript Function

```javascript
function createChart(data, svg, d3, width, height) {
  const radius = Math.min(width, height) / 2 - 20;
  
  const pie = d3.pie()
    .value(d => d.value);
  
  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);
  
  const g = svg.append('g')
    .attr('transform', `translate(${width/2}, ${height/2})`);
  
  const arcs = g.selectAll('.arc')
    .data(pie(data))
    .enter().append('g')
    .attr('class', 'arc');
  
  arcs.append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => d3.schemeCategory10[i]);
  
  // Add labels
  arcs.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text(d => d.data.name);
    
  return svg;
}
```

## Features

- Auto-sized to fit widget dimensions
- Uses D3's built-in color scheme
- Shows product labels on slices