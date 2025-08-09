# Widget Scrolling Issues

## Problem
Mouse scroll doesn't work inside widgets - have to use traditional scrollbar

## Ideas to try (one at a time):

1. **overscroll-behavior: contain** - Prevent scroll events from bubbling up
2. **scroll-behavior: smooth** - Better scroll experience  
3. **Check for pointer-events interference** - Make sure nothing is blocking mouse events
4. **Explicit height on scroll containers** - Ensure containers have defined dimensions
5. **Check for CSS transform issues** - 3D transforms can sometimes break scrolling
6. **Add explicit wheel event handlers** - JavaScript fallback for broken scroll
7. **Check browser dev tools** - See if scroll events are being captured

## Tried:
1. ❌ **overscroll-behavior: contain** - Didn't work
2. ❌ **min-height on scroll containers** - Didn't work
3. ❌ **Removed transform-style: preserve-3d** - Didn't work

## User insight:
- Issue seems to be specifically with `.results-table`, not the card transforms
- **KEY CLUE**: When hovering table in inspector, blue highlight extends to bottom and right edge of browser - table thinks it's bigger than its container!

## Tried:
4. ❌ **table-layout: fixed + max-width** - Made text jumbled, reverted

## Tried:
5. ❌ **height: 0 on flex container** - (assuming this didn't work)

## Tried:
6. ❌ **display: block on table + extra wrapper + overflow auto** - Didn't work, reverted to clean structure

## ✅ SOLUTION FOUND!
**The issue was `flex: 1` on `.widget-content`!**

Removing `flex: 1` fixed the mouse scrolling issue.

## Why this worked:
The `flex: 1` was making the widget-content try to expand to fill available space, which was confusing the browser's scroll calculations. Without it, the content naturally sizes to its content and scroll works normally.

## Final clean structure:
- widget-content (no flex: 1) > table
- No extra wrapper divs needed!

## More ideas to try:

6. **Add `contain: layout style paint`** - CSS containment to isolate the scrolling context
7. **Try `overflow-x: hidden` on table container** - Force horizontal constraint 
8. **Add `box-sizing: border-box` everywhere** - Ensure consistent sizing model
9. **Remove `border-collapse` on table** - This can sometimes cause sizing issues
10. **Add explicit `max-height` instead of flex** - Give container fixed dimensions
11. **Try `display: block` on table** - Force table to behave like a block element
12. **Add `will-change: scroll-position`** - Hint to browser for scroll optimization
13. **Check if any parent has `overflow: hidden`** - Could be blocking scroll events
14. **Try wrapping table in extra div** - Sometimes nested containers help
15. **JavaScript wheel event listener** - Manual scroll handling as fallback
16. **Check browser dev tools for event listeners** - See what's capturing scroll events
17. **Try different `position` values** - relative/absolute/static on containers
18. **Remove all flexbox and use CSS Grid** - Different layout system might work better