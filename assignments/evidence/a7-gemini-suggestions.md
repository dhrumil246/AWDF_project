# Gemini UI suggestions (unedited)

Model: `gemini-3.5-flash-lite` · requested 2026-10-21T08:10:42.490Z

## 1. Improve Delete Button Contrast and Visual Hierarchy
**Problem:** In Screenshot 1, the 'Delete' action button inside the card actions uses a faint red text (`#b91c1c`) and a very light border (`#fecaca`) on a white surface, failing WCAG contrast requirements and lacking a solid anchor to convey a destructive action.

**Change:** Update the `.action-danger` CSS rules to use a solid background colour and higher contrast text.

```css
.action-danger { background: #fee2e2; color: #991b1b; border-color: #fca5a5; font-weight: 500; }
```
**Why:** Providing a light red background fill makes destructive buttons clearly distinguishable from standard links or secondary buttons at a glance.

**Accessibility:** Increases contrast ratio well above WCAG 2.1 AA standards for UI components, helping users with low vision identify dangerous actions safely.

## 2. Enhance Keyboard Focus Indicators
**Problem:** The application relies on native browser outlines for focused interactive elements like buttons, inputs, and navigation links. These can be inconsistent or hard to spot against light backgrounds.

**Change:** Add explicit, highly visible focus ring styles globally for all interactive elements.

```css
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
```
**Why:** Provides a consistent, brand-aligned visual indicator whenever a user navigates the application via keyboard.

**Accessibility:** Directly satisfies WCAG 2.1 Success Criterion 2.4.7 (Focus Visible), ensuring complete keyboard navigability for users with motor impairments.

## 3. Increase Touch Target Sizes for Card Actions
**Problem:** In Screenshot 1, the card action buttons ('Edit', 'Mark sold', 'Delete') have small padding (`4px 10px`), resulting in touch targets smaller than the recommended minimum height.

**Change:** Increase the vertical and horizontal padding on `.action` elements to expand their hit area.

```css
.action { padding: 8px 12px; }
```
**Why:** Larger interactive areas reduce input errors and make touch targets much easier to activate on mobile and tablet touchscreens.

**Accessibility:** Aligns with WCAG 2.1 Success Criterion 2.5.5 (Target Size), significantly improving usability for users with dexterity impairments.

## 4. Boost Sold Badge Contrast
**Problem:** In Screenshot 1, the 'SOLD' badge uses light grey text (`#475569`) on a lighter grey background (`#e2e8f0`), which can be difficult to read for users with visual impairments.

**Change:** Darken the text color for the `.badge-sold` class to guarantee adequate contrast against its surface background.

```css
.badge-sold { background: #cbd5e1; color: #1e293b; }
```
**Why:** Darkening the text increases the luminance contrast ratio, making inventory statuses instantly legible across different lighting conditions.

**Accessibility:** Meets WCAG 2.1 AA contrast requirements for small text (at least 4.5:1), ensuring critical inventory details are readable by everyone.

## 5. Improve Form Input Focus and Border Definition
**Problem:** In Screenshot 2, form inputs feature a subtle border (`var(--border)`) that can blend into the background, making boundary recognition weak for users with low vision.

**Change:** Darken the default input border color slightly and add a clear focus state ring.

```css
.form input, .form select, .form textarea, .search { border-color: #cbd5e1; } .form input:focus, .form select:focus, .form textarea:focus, .search:focus { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand); outline: none; }
```
**Why:** Clearer form boundaries help users instantly recognize interactive text fields and understand active typing states.

**Accessibility:** Aids users with cognitive and visual limitations by clearly demarcating input boundaries and active focus areas.
