# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TabMap is a Chrome/Edge browser extension (Manifest V3) that allows users to save and organize open browser tabs into groups. It features a popup for quick tab saving and a custom new tab page that displays all saved tabs with group management capabilities.

## Architecture

### Core Components

1. **popup.html/popup.js** - Extension popup (300px width)
   - Quick save all open tabs
   - Create new groups
   - List existing groups with click-to-save functionality
   - Button to open dashboard in top-right corner

2. **newtab.html/newtab.js** - Full dashboard (replaces browser new tab)
   - Collapsible form to add individual tabs (hidden by default, toggle button in header)
   - Display saved tabs organized by groups
   - Drag & drop tabs between groups or to "ungrouped"
   - Group management (create, delete, open all tabs)

3. **i18n.js** - Internationalization system
   - Supports 10 languages: Spanish (es), English (en), Chinese (zh), Hindi (hi), Arabic (ar), Portuguese (pt), Bengali (bn), Russian (ru), Japanese (ja), French (fr)
   - Auto-detects browser language via `navigator.language`
   - Falls back to English if language not supported
   - Use `t('key', {params})` function for translations

4. **background.js** - Service worker (minimal, just logs installation)

### Data Model

Stored in `chrome.storage.local`:

- **savedTabs**: Array of tab objects
  ```js
  {
    title: string,
    url: string,
    groupId?: string  // optional, only if tab belongs to a group
  }
  ```

- **groups**: Array of group objects
  ```js
  {
    id: string,      // timestamp-based unique ID
    name: string     // user-provided name
  }
  ```

### Layout Architecture

**Dashboard (newtab.html) Layout Structure:**

The layout uses a vertical structure with two main sections:

```
#tabsContainer (flex column, gap: 30px)
  ├── .ungrouped-section (flex column)
  │   ├── Title: "Sin Grupo"
  │   └── #ungroupedTabsContainer (flex horizontal with wrap)
  │       └── Tab cards (350px fixed width each)
  └── .groups-wrapper (flex column)
      └── .groups-grid (flex horizontal with wrap, 2 columns)
          └── .group-container (50% width each, min-height: 300px)
              ├── .group-header (title + action buttons)
              └── .group-tabs (flex horizontal with wrap, flex: 1)
                  └── Tab cards (350px fixed width each)
```

**Key Layout Rules:**
- Container: `max-width: 100%` with responsive breakpoint at 1400px (`max-width: 1800px`)
- **Ungrouped section** displays first, tabs in horizontal rows (350px each, wraps automatically)
- **Groups section** displays second:
  - Groups arranged in 2 columns using flexbox
  - Each group card: `width: calc(50% - 10px)`
  - Tabs inside groups: horizontal with wrap, 350px fixed width
  - Group drop zone expands to fill card: `flex: 1`, `min-height: 200px`

**Tab Cards:**
- Fixed `350px` width (not responsive percentages)
- `20px` gap between ungrouped tabs, `15px` gap inside groups
- Include checkbox (top-left, appears on hover), delete button (top-right, appears on hover)
- Draggable for group reassignment with full card as drop zone

### Styling Patterns

- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Card style: white background, `border-radius: 12px`, shadow
- Buttons use consistent color scheme:
  - Primary actions: `#667eea`
  - Success/Open: `#10b981`
  - Delete/Danger: `#ef4444`

### Key Features

1. **Group Management**
   - Groups displayed with capitalized first letter via `capitalizeFirst()` helper
   - Create group via prompt dialog
   - Delete group (tabs become ungrouped, not deleted)
   - Open all tabs in group simultaneously

2. **Drag & Drop**
   - Uses HTML5 drag events with `draggable="true"`
   - Drop zones: group containers and ungrouped container
   - Visual feedback: `.dragging` class and `.drag-over` class
   - Moving tab updates its `groupId` or removes it

3. **Bulk Operations**
   - Multi-select with checkboxes
   - Actions bar appears when items selected
   - Open selected or delete selected

4. **Duplicate Prevention**
   - URLs checked against existing tabs before saving
   - Excluded URLs: chrome://, edge://, chrome-extension://, about:blank

## Development Notes

### Adding Translations

When adding new UI text:
1. Add key to all 10 language objects in `i18n.js`
2. Use `t('key')` or `t('key', {param: value})` to retrieve
3. For plurals, use `{plural}` placeholder - automatically replaced based on `count` param

### Modifying Layouts

**Critical Layout Constraints:**
- Dashboard uses `max-width: 100%` to fill screen width
- **DO NOT change tab card width from 350px** - it's fixed for proper 2-column group layout
- Main container uses `flex-direction: column` to separate ungrouped from groups vertically
- Groups must be `width: calc(50% - 10px)` to achieve 2-column layout
- Group drop zones need `flex: 1` to expand and fill available space
- Always use `flex-wrap: wrap` for horizontal tab arrangements

### Storage Operations

All storage uses `chrome.storage.local`:
```js
// Read
const result = await chrome.storage.local.get(['savedTabs', 'groups']);
const tabs = result.savedTabs || [];

// Write
await chrome.storage.local.set({ savedTabs: newArray });
```

### Testing the Extension

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the TabMap directory
5. Test popup: Click extension icon in toolbar
6. Test dashboard: Open new tab (it will be replaced by TabMap)

### Common Patterns

**Escaping HTML**: Always use `escapeHtml(text)` before inserting user content into innerHTML
**Group names**: Display with `capitalizeFirst(group.name)`
**Event listeners**: Attach after rendering with `attachEventListeners()` and `setupDragAndDrop()`
**Empty states**: Check array length and show appropriate message with icon

## File Structure

```
TabMap/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker
├── popup.html/js          # Extension popup UI
├── newtab.html/js         # Dashboard (new tab override)
├── i18n.js               # Translation system
└── tabmap.png            # Extension icon
```
