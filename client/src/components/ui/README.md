# Brightloop Editorial UI Kit (Person 4)

Shared editorial design system components adhering strictly to the **Brightloop Shared Contract (Section 10)**.

- **Typography**: Inter font, uppercase labels/headings/buttons/badges, letter spacing `0.08em`, font-weight 600-900.
- **Palette**: Maroon (`#800000`), Maroon Deep (`#660000`), Cream (`#ECE9DC`), Ink (`#1A1614`), Line (`#5A5550`).
- **Aesthetic**: Flat, editorial, 0px border radius, no shadows, no gradients.

---

## 1. Button
`import { Button } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'maroon' \| 'danger' \| 'outline' \| 'ghost'` | `'primary'` | Style variant |
| `fullWidth` | `boolean` | `false` | Expand to full parent width |
| `disabled` | `boolean` | `false` | Disables button and prevents clicks |
| `loading` | `boolean` | `false` | Shows spinner and "Loading..." |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `function` | `undefined` | Click handler |

---

## 2. Input
`import { Input } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `undefined` | Uppercase field label above input |
| `error` | `string` | `undefined` | Error message displayed in maroon |
| `helper` | `string` | `undefined` | Helper text displayed below input |
| `fullWidth` | `boolean` | `true` | Full width container |
| `...props` | `HTMLInputElement` | | Standard HTML input attributes |

---

## 3. Select
`import { Select } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | `undefined` | Uppercase field label |
| `error` | `string` | `undefined` | Error message displayed in maroon |
| `options` | `Array<{ value, label }>` | `[]` | Select options list |
| `children` | `ReactNode` | `undefined` | Or inline `<option>` elements |

---

## 4. StatusBadge
`import { StatusBadge } from '../components/ui';`

| Prop | Type | Description |
|---|---|---|
| `status` | `string` | Supported statuses: `paid` (ink fill), `confirmed` (ink outline), `overdue` (maroon fill), `draft` (dashed outline), `cancelled`/`closed` (muted), `active` (deep ink fill), `quotation` (dotted outline), `paused` (amber). |

---

## 5. KpiCard
`import { KpiCard } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Metric label (uppercase 11px) |
| `value` | `string \| number` | required | Metric value in bold monospace |
| `subtitle` | `string` | `undefined` | Contextual micro-copy |
| `variant` | `'maroon' \| 'maroonDeep' \| 'ink' \| 'outlined' \| 'default'` | `'default'` | Background/text palette |
| `icon` | `LucideIcon` | `undefined` | Optional icon |

---

## 6. FilterChips
`import { FilterChips } from '../components/ui';`

| Prop | Type | Description |
|---|---|---|
| `options` | `Array<{ key, label, count? }>` | List of selectable filter options |
| `selected` | `string` | Currently active filter key |
| `onChange` | `(key: string) => void` | Selection callback |

---

## 7. StatusStepper
`import { StatusStepper } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `string[]` | `['draft', 'quotation', 'confirmed', 'active', 'closed']` | Ordered stages |
| `current` | `string` | required | Current stage identifier |
| `labels` | `Record<string, string>` | `{}` | Optional label overrides |

---

## 8. DataTable
`import { DataTable } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `Array<{ header, accessor?, render?, align?, className? }>` | `[]` | Table column definitions |
| `data` | `Array<any>` | `[]` | Table rows array |
| `loading` | `boolean` | `false` | Displays 5-row pulse skeleton |
| `emptyMessage` | `string` | `'No records found'` | Displayed when `data.length === 0` |
| `page` | `number` | `1` | Current active page |
| `totalPages` | `number` | `1` | Total available pages |
| `total` | `number` | `0` | Total records in query |
| `onPageChange`| `(page: number) => void` | `undefined` | Page navigation handler |
| `onRowClick` | `(row: any) => void` | `undefined` | Row click handler |

---

## 9. Modal
`import { Modal } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Controls visibility |
| `onClose` | `() => void` | required | Close callback (click backdrop, X, or Esc) |
| `title` | `string` | `undefined` | Modal header title |
| `subtitle` | `string` | `undefined` | Modal header sub-title |
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '4xl'` | `'md'` | Max width breakpoint |

---

## 10. PageHeader
`import { PageHeader } from '../components/ui';`

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Large uppercase page title |
| `subtitle` | `string` | Secondary descriptive micro-copy |
| `actions` | `ReactNode` | Action buttons (Export, New, Filters, etc.) |

---

## 11. ConfirmDialog
`import { ConfirmDialog } from '../components/ui';`

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | required | Visibility |
| `title` | `string` | `'Confirm Action'` | Title |
| `message` | `string` | required | Dialog body text |
| `confirmText` | `string` | `'Confirm'` | Confirm button label |
| `cancelText` | `string` | `'Cancel'` | Cancel button label |
| `danger` | `boolean` | `false` | Uses maroon danger button |
| `loading` | `boolean` | `false` | Disables buttons during action |
| `onConfirm` | `() => void` | required | Confirm callback |
| `onClose` | `() => void` | required | Cancel callback |
