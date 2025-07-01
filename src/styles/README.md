# CaseFlow CSS Architecture

This document explains the master CSS system for consistent design across all CaseFlow components.

## Master CSS System

### Files Structure
- **`master.css`** - Central design system with CSS variables and common components
- **Individual component CSS files** - Component-specific overrides and unique styles

### Design Tokens (CSS Variables)

#### Colors
```css
/* Background Colors */
--color-bg-primary: #121212      /* Main app background */
--color-bg-secondary: #1a1a1a    /* Sidebar background */
--color-bg-tertiary: #1e1e1e     /* Card backgrounds */
--color-bg-elevated: #2b2d31     /* Modal backgrounds */
--color-bg-hover: #252525        /* Hover states */
--color-bg-active: #2d2d2d       /* Active/selected states */

/* Text Colors */
--color-text-primary: #e0e0e0    /* Main text */
--color-text-secondary: #dcddde  /* Secondary text */
--color-text-muted: #b0b0b0      /* Muted text */
--color-text-subtle: #72767d     /* Very subtle text */
--color-text-white: #ffffff      /* White text for emphasis */

/* Brand & Status Colors */
--color-brand-primary: #4361ee   /* Primary brand color */
--color-success: #2d7d46         /* Success/complete actions */
--color-danger: #ed4245          /* Error/danger actions */
```

#### Typography
```css
/* Font Families */
--font-family-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...
--font-family-mono: 'Roboto Mono', 'SF Mono', Monaco, ...

/* Font Sizes */
--font-size-xs: 0.75rem    /* 12px */
--font-size-sm: 0.85rem    /* ~14px */
--font-size-base: 0.95rem  /* ~15px */
--font-size-lg: 1.1rem     /* ~18px */
--font-size-xl: 1.25rem    /* 20px */
--font-size-2xl: 1.5rem    /* 24px */

/* Font Weights */
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
```

#### Spacing
```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
```

## Common Components

### Buttons
The master CSS provides a standardized button system:

```css
.btn                 /* Base button styles */
.btn-primary         /* Brand primary button */
.btn-success         /* Success/complete actions */
.btn-danger          /* Delete/dangerous actions */
.btn-secondary       /* Secondary actions */
.btn-ghost           /* Subtle/ghost buttons */

/* Sizes */
.btn-sm              /* Small buttons */
.btn-lg              /* Large buttons */
```

### Forms
Consistent form styling with CSS variables:

```css
.input-group         /* Form field container */
.input-group label   /* Form labels */
.input-group input   /* Form inputs */
.input-group textarea /* Text areas */
```

### Cards
```css
.card                /* Base card component */
.card-header         /* Card header section */
.card-title          /* Card title styling */
.card-content        /* Card content area */
```

### Modals
```css
.modal               /* Modal overlay */
.modal-content       /* Modal container */
.modal-header        /* Modal header */
.modal-body          /* Modal content */
.modal-footer        /* Modal actions */
```

## Utility Classes

### Layout
```css
.flex, .flex-col, .flex-row
.items-center, .items-start, .items-end
.justify-center, .justify-between, .justify-end
.gap-1, .gap-2, .gap-3, .gap-4, .gap-6
```

### Typography
```css
.text-xs, .text-sm, .text-base, .text-lg
.text-white, .text-muted, .text-subtle
.font-medium, .font-semibold, .font-mono
```

### Spacing & Display
```css
.m-0, .mt-0, .mb-4, .mb-6
.p-0, .p-4
.hidden, .block, .inline-block
```

## Usage Guidelines

### 1. Import Order
Always import master.css first in index.html:
```html
<link rel="stylesheet" href="styles/master.css">
<link rel="stylesheet" href="styles/component-specific.css">
```

### 2. Use CSS Variables
Instead of hardcoded values, use the CSS variables:
```css
/* Bad */
background-color: #1e1e1e;
padding: 16px;
color: #ffffff;

/* Good */
background-color: var(--color-bg-tertiary);
padding: var(--space-4);
color: var(--color-text-white);
```

### 3. Component-Specific Overrides
When creating component-specific styles, scope them to avoid conflicts:
```css
/* Scoped to specific component */
#claimModal .modal-header {
    /* Component-specific styles here */
}

.case-card .btn {
    /* Case card specific button styles */
}
```

### 4. Consistent Button Usage
Use the standardized button classes:
```html
<button class="btn btn-success">Complete Case</button>
<button class="btn btn-danger">Delete</button>
<button class="btn btn-secondary btn-sm">Cancel</button>
```

## Migration Status

### ✅ Completed
- **master.css** - Complete design system
- **claim-case.css** - Fully migrated to CSS variables
- **left-sidebar.css** - Fully migrated to CSS variables
- **completed-cases.css** - Key sections migrated
- **index.html** - Updated to use master CSS

### 🔄 Remaining Files
The following files can be updated to use CSS variables when touched:
- `right-sidebar.css`
- `parent-case.css`
- `announcements.css`
- `resources.css`
- `logs-chat.css`
- `pings.css`
- `home.css`
- `login.css`

## Benefits

1. **Consistency** - All components use the same color palette, typography, and spacing
2. **Maintainability** - Change design tokens in one place to update the entire app
3. **Scalability** - Easy to add new components that automatically match the design system
4. **Developer Experience** - Clear naming conventions and utility classes speed up development
5. **Theme Support** - CSS variables make it easy to implement theme switching in the future

## Best Practices

1. Always use CSS variables instead of hardcoded values
2. Use utility classes for common styling patterns
3. Scope component-specific styles to avoid conflicts
4. Follow the established naming conventions
5. Test changes across all components to ensure consistency

This system ensures CaseFlow maintains a professional, consistent appearance across all views and components while making future maintenance and updates much easier. 