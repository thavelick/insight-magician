# Simple Line Chart

A basic line chart for time series data.

## SQL Query

```sql
SELECT date, visits FROM daily_stats ORDER BY date
```

## Expected Data Structure

Your function will receive:
```javascript
[
  { date: '2024-01-01', visits: 120 },
  { date: '2024-01-02', visits: 135 },
  { date: '2024-01-03', visits: 98 },
  { date: '2024-01-04', visits: 156 },
  { date: '2024-01-05', visits: 142 },
  { date: '2024-01-06', visits: 189 },
  { date: '2024-01-07', visits: 167 }
]
```

## JavaScript Function

```javascript
function createChart(data, svg, d3, width, height) {
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Parse dates and create scales
  const parseDate = d3.timeParse('%Y-%m-%d');
  data.forEach(d => d.date = parseDate(d.date));
  
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, chartWidth]);
    
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.visits)])
    .range([chartHeight, 0]);
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
  // Create line
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.visits))
    .curve(d3.curveMonotoneX);
  
  // Add line path
  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'steelblue')
    .attr('stroke-width', 2)
    .attr('d', line);
  
  // Add dots
  g.selectAll('.dot')
    .data(data)
    .enter().append('circle')
    .attr('class', 'dot')
    .attr('cx', d => xScale(d.date))
    .attr('cy', d => yScale(d.visits))
    .attr('r', 4)
    .attr('fill', 'steelblue');
  
  // Add axes
  g.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d')));
    
  g.append('g')
    .call(d3.axisLeft(yScale));
    
  return svg;
}
```

## Features

- Auto-scales X and Y axes based on data
- Smooth curved line with monotone interpolation
- Data points marked with circles
- Date formatting on X-axis
- Proper margins for axes and labels