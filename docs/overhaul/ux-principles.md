# UX & UI Overhaul Principles

These principles guide the redesign of the Titikrasa POS dashboard so that the refactored architecture ships with a cohesive, modern, and usable interface.

## Design System Foundations
- **Tokens first**: define colour palette (primary, success, warning, surface, background), typography scale, spacing, and radii in a central tokens file (CSS variables or Tailwind config). All components must reference tokens instead of hard-coded values.
- **Light & dark themes**: ensure tokens include semantic roles (`--color-bg-surface`, `--color-text-muted`) and support theme switching without rewriting components.
- **Component library alignment**: leverage shadcn UI primitives as the base, extending only when necessary. Custom components must live in `components/ui` with stories documenting their states.

## Layout & Navigation
- **Dashboard shell**: adopt a left-aligned navigation rail with collapsible sections for Menus, Inventory, Procurement, Recipes, Users, and Settings. Keep breadcrumbs within page header for secondary navigation.
- **Responsive behaviour**: navigation collapses into an off-canvas drawer on screens < 1024px; tables use horizontal scrolling with sticky headers.
- **Consistent page header**: include page title, description, primary action button, and quick filters aligned right. Header must remain sticky for context while scrolling long tables.

## Data Presentation
- **Table density control**: offer two density modes (comfortable, compact) saved per user. Default to comfortable for readability.
- **Empty & loading states**: each table must show meaningful empty states (illustration + guidance) and skeleton loaders matching column layout.
- **Inline feedback**: use toast notifications for global success/error, but also show inline banners for table-level issues (e.g., failed fetch).
- **Column hierarchy**: prioritise important columns leftmost, use truncation with tooltips for long text, and display monetary values with locale-aware formatting.

## Forms & Dialogs
- **Progressive disclosure**: break complex forms into steps or accordions; avoid overwhelming users with long single-column forms.
- **Validation feedback**: show inline error messages beneath inputs, summary banner for submission errors, and disable submit when pending.
- **Keyboard accessibility**: ensure tab order follows visual layout, focus returns to triggering element after dialog close, and shortcuts (e.g., `Ctrl+S` to save) are supported where valuable.

## Interaction Patterns
- **Hybrid state alignment**: reflect hybrid state principle by keeping server operations fast with optimistic updates but providing undo snackbar when destructive actions occur.
- **Bulk actions**: table selection surfaces bulk action bar with contextual options (delete, export). Hide bulk actions when no rows selected.
- **Search & filter**: unify search input placement (toolbar left) and filter chips (toolbar right). Filters open panels or popovers rather than inline forms.
- **Notifications**: centralise toasts using a notification centre accessible from header; long-running tasks show progress indicator.

## Accessibility & Internationalisation
- **WCAG 2.1 AA baseline**: maintain colour contrast, provide aria labels for icons, support screen readers with semantic HTML.
- **Keyboard support**: all interactive elements reachable via keyboard, focus visible states defined by tokens.
- **Locale readiness**: text content uses translation keys; date/number formatting passes locale data from view-model.

## Implementation Milestones
1. **Token definition** – extract colours/spacing/typography into tokens; update global styles.
2. **Layout shell** – refactor dashboard layout to new navigation + header structure.
3. **Component library updates** – audit existing shadcn components, extend as needed (buttons, inputs, toasts) with stories.
4. **Table UI** – apply reusable data-table design with toolbar, density toggle, empty/loading states.
5. **Form refresh** – adopt schema-driven forms with consistent spacing, inline validation, and stepper patterns.
6. **Accessibility sweep** – run axe or similar tooling to ensure compliance, fix issues before release.

Adhering to these principles ensures the technical overhaul delivers a UX that feels modern, consistent, and maintainable.
