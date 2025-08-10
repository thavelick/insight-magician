# Interactive Pie Chart

An advanced donut chart with hover effects, animations, and data grouping.

## SQL Query

For Northwind database:
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

Or for sample database:
```sql
SELECT category as country, count as order_count FROM sales
```

## Expected Data Structure

Your function will receive (sorted by order_count DESC):
```javascript
[
  { country: 'USA', order_count: 122 },
  { country: 'Germany', order_count: 61 },
  { country: 'Brazil', order_count: 83 },
  // ... more countries
]
```

## JavaScript Function

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

## Features

- **Data Grouping**: Shows top 6 countries, groups the rest as "Others"
- **Interactive Hover**: Slices expand and show details on hover
- **Gradient Fills**: Beautiful radial gradients for each slice
- **Smooth Animations**: Slices animate in sequentially
- **Donut Style**: Inner radius creates modern donut appearance
- **Responsive Labels**: Labels positioned outside slices with smart anchoring