import { describe, expect, test } from "bun:test";

class TestWidget {
  validateChartFunction(functionCode) {
    if (!functionCode || typeof functionCode !== "string") {
      return {
        isValid: false,
        error: "Chart function must be a non-empty string",
      };
    }
    const trimmedCode = functionCode.trim();
    if (!trimmedCode) {
      return { isValid: false, error: "Chart function cannot be empty" };
    }
    // Check for dangerous loop constructs that could cause infinite loops
    const dangerousPatterns = [
      {
        pattern: /while\s*\(/,
        message: "while loops are not allowed due to infinite loop risk",
      },
      {
        pattern: /for\s*\(.*;;.*\)/,
        message: "infinite for loops (for(;;)) are not allowed",
      },
      {
        pattern: /do\s*\{[\s\S]*\}\s*while\s*\(/,
        message: "do-while loops are not allowed due to infinite loop risk",
      },
    ];
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(trimmedCode)) {
        return {
          isValid: false,
          error: `Dangerous code detected: ${message}`,
        };
      }
    }
    try {
      // Basic syntax validation using Function constructor
      new Function(trimmedCode);
      return { isValid: true };
    } catch (error) {
      let errorMessage = error.message;
      // Add line and column info if available
      if (error.lineNumber && error.columnNumber) {
        errorMessage = `Line ${error.lineNumber}, Column ${error.columnNumber}: ${errorMessage}`;
      } else if (error.lineNumber) {
        errorMessage = `Line ${error.lineNumber}: ${errorMessage}`;
      }
      return {
        isValid: false,
        error: `JavaScript syntax error: ${errorMessage}`,
      };
    }
  }
}

describe("Chart Function Validation", () => {
  const widget = new TestWidget();

  describe("Input validation", () => {
    test("should reject null input", () => {
      const result = widget.validateChartFunction(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Chart function must be a non-empty string");
    });

    test("should reject undefined input", () => {
      const result = widget.validateChartFunction(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Chart function must be a non-empty string");
    });

    test("should reject non-string input", () => {
      const result = widget.validateChartFunction(123);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Chart function must be a non-empty string");
    });

    test("should reject empty string", () => {
      const result = widget.validateChartFunction("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Chart function must be a non-empty string");
    });

    test("should reject whitespace-only string", () => {
      const result = widget.validateChartFunction("   \n\t  ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Chart function cannot be empty");
    });
  });

  describe("Dangerous pattern detection", () => {
    test("should reject while loops", () => {
      const code = `function test() { while (true) { console.log('loop'); } }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Dangerous code detected: while loops are not allowed due to infinite loop risk",
      );
    });

    test("should reject while loops with different spacing", () => {
      const code = "function test() { while(condition) { code(); } }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Dangerous code detected: while loops are not allowed due to infinite loop risk",
      );
    });

    test("should reject infinite for loops", () => {
      const code = `function test() { for (;;) { console.log('infinite'); } }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Dangerous code detected: infinite for loops (for(;;)) are not allowed",
      );
    });

    test("should allow for loops with spaces (not infinite pattern)", () => {
      const code = "function test() { for ( ; ; ) { code(); } }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should reject do-while loops (detected as while loops)", () => {
      const code = `function test() { do { console.log('loop'); } while (true); }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Dangerous code detected: while loops are not allowed due to infinite loop risk",
      );
    });

    test("should reject multiline do-while loops (detected as while loops)", () => {
      const code = `function test() { 
        do {
          console.log('loop');
          other();
        } while (condition);
      }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Dangerous code detected: while loops are not allowed due to infinite loop risk",
      );
    });

    test("should allow safe for loops with conditions", () => {
      const code =
        "function test() { for (let i = 0; i < 10; i++) { console.log(i); } }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should allow for-of loops", () => {
      const code =
        "function test() { for (const item of items) { console.log(item); } }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should allow for-in loops", () => {
      const code =
        "function test() { for (const key in obj) { console.log(key); } }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });
  });

  describe("JavaScript syntax validation", () => {
    test("should accept valid function syntax", () => {
      const code = `function createChart(data, svg, d3, width, height) {
        svg.append('circle').attr('cx', 50).attr('cy', 50).attr('r', 25);
        return svg;
      }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should reject invalid JavaScript syntax", () => {
      const code = "function test() { let x = ; }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toStartWith("JavaScript syntax error:");
    });

    test("should reject unclosed braces", () => {
      const code = `function test() { console.log('test');`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toStartWith("JavaScript syntax error:");
    });

    test("should reject malformed function declaration", () => {
      const code = "function () { return true; }";
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(false);
      expect(result.error).toStartWith("JavaScript syntax error:");
    });
  });

  describe("Valid chart function patterns", () => {
    test("should accept typical D3 chart function", () => {
      const code = `function createChart(data, svg, d3, width, height) {
        const margin = { top: 20, right: 30, bottom: 40, left: 90 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        const xScale = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.value)])
          .range([0, innerWidth]);
          
        const yScale = d3.scaleBand()
          .domain(data.map(d => d.name))
          .range([0, innerHeight])
          .padding(0.1);
          
        const g = svg.append('g')
          .attr('transform', \`translate(\${margin.left}, \${margin.top})\`);
          
        g.selectAll('rect')
          .data(data)
          .enter()
          .append('rect')
          .attr('x', 0)
          .attr('y', d => yScale(d.name))
          .attr('width', d => xScale(d.value))
          .attr('height', yScale.bandwidth());
          
        return svg;
      }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should accept arrow functions", () => {
      const code = `const createChart = (data, svg, d3, width, height) => {
        svg.append('text').text('Hello World');
        return svg;
      }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });

    test("should accept functions with conditional logic", () => {
      const code = `function createChart(data, svg, d3, width, height) {
        if (data.length === 0) {
          svg.append('text').text('No data available');
          return svg;
        }
        
        data.forEach((item, index) => {
          svg.append('circle')
            .attr('cx', index * 50)
            .attr('cy', 50)
            .attr('r', item.value);
        });
        
        return svg;
      }`;
      const result = widget.validateChartFunction(code);
      expect(result.isValid).toBe(true);
    });
  });
});
