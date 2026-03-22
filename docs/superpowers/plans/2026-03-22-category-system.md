# Category System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add predefined categories to marketplace cards with emoji pill filters and a category selector on the create form.

**Architecture:** New `category` column on `marketplace_items`, shared category constants, marketplace API accepts category filter, marketplace UI gets emoji pill buttons replacing the type dropdown, create ad page gets a category picker.

**Tech Stack:** Next.js 16, React 19, Drizzle ORM, PostgreSQL, Tailwind CSS

---

### Task 1: Shared constants + Schema + DB

**Files:**
- Create: `streamads/src/lib/categories.ts`
- Modify: `streamads/src/lib/db/schema.ts`

- [ ] **Step 1: Create the shared categories constant**

Create `streamads/src/lib/categories.ts`:

```typescript
export const CATEGORIES = [
  { key: 'coding', label: 'Coding', emoji: '💻' },
  { key: 'monetize', label: 'Monetize', emoji: '💰' },
  { key: 'gear', label: 'Gear', emoji: '🎧' },
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
  { key: 'food', label: 'Food', emoji: '🍔' },
  { key: 'merch', label: 'Merch', emoji: '👕' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'learning', label: 'Learning', emoji: '📚' },
  { key: 'other', label: 'Other', emoji: '✨' },
] as const;

export type CategoryKey = typeof CATEGORIES[number]['key'];
```

- [ ] **Step 2: Add category to schema**

In `streamads/src/lib/db/schema.ts`, add `category: text('category'),` to the `marketplaceItems` table definition, after the `colorStyle` line.

- [ ] **Step 3: Add column to database**

```bash
psql postgresql://thedevdad@localhost:5432/streamads -c "ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS category text;"
```

- [ ] **Step 4: Commit**

```bash
git add streamads/src/lib/categories.ts streamads/src/lib/db/schema.ts
git commit -m "feat: add category constants and schema column"
```

---

### Task 2: API changes — category filter + POST

**Files:**
- Modify: `streamads/src/app/api/marketplace/route.ts`

- [ ] **Step 1: Add category filter to GET**

Read the file first. In the GET handler, after the existing `type` filter block (around line 58), add:

```typescript
const category = url.searchParams.get('category');
if (category) {
  conditions.push(eq(marketplaceItems.category, category));
}
```

- [ ] **Step 2: Add category to POST**

In the POST handler, read `category` from the request body alongside the other fields. Add it to the `db.insert` values:

```typescript
const { headline, subtext, brandUrl, imageUrl, colorTheme, colorStyle, subtext2, category } = body;
```

And in the `.values()` call, add: `category: type === 'ad' ? (category || null) : null,`

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/api/marketplace/
git commit -m "feat: add category filter to marketplace GET and POST"
```

---

### Task 3: Marketplace UI — emoji pill filters

**Files:**
- Modify: `streamads/src/app/(app)/marketplace/page.tsx`

- [ ] **Step 1: Replace the type dropdown with emoji pills**

Read the current marketplace page first. Import `CATEGORIES` from `@/lib/categories`.

Add a new state: `const [categoryFilter, setCategoryFilter] = useState('');`

Replace the `<select>` dropdown (the type filter) with a wrapping row of emoji pill buttons:

```tsx
<div className="mb-6 flex flex-wrap gap-2">
  {/* All pill */}
  <button
    onClick={() => setCategoryFilter('')}
    className="rounded-xl px-4 py-2 text-xs font-medium transition-all"
    style={{
      background: !categoryFilter ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
      color: !categoryFilter ? '#1e2030' : '#b8c0e0',
      border: `1px solid ${!categoryFilter ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
    }}
  >
    All
  </button>
  {CATEGORIES.map((cat) => (
    <button
      key={cat.key}
      onClick={() => setCategoryFilter(categoryFilter === cat.key ? '' : cat.key)}
      className="rounded-xl px-4 py-2 text-xs font-medium transition-all"
      style={{
        background: categoryFilter === cat.key ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
        color: categoryFilter === cat.key ? '#1e2030' : '#b8c0e0',
        border: `1px solid ${categoryFilter === cat.key ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
        fontFamily: 'var(--font-family-display)',
      }}
    >
      {cat.emoji} {cat.label}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Wire category filter to fetch**

Add `categoryFilter` to the dependency array of the `useEffect` that calls `fetchItems()`. In `fetchItems()`, add:

```typescript
if (categoryFilter) params.set('category', categoryFilter);
```

Remove the old `typeFilter` state and the `<select>` if it's still there (it should have been replaced in Step 1). Keep any `type` param logic if the "Friend Ads" / "Overlay Tools" distinction is still needed — in that case keep it as a separate smaller filter or remove it entirely since categories now serve that purpose.

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/\(app\)/marketplace/
git commit -m "feat: add emoji category pill filters to marketplace"
```

---

### Task 4: Create ad page — category selector

**Files:**
- Modify: `streamads/src/app/(app)/create/ad/page.tsx`

- [ ] **Step 1: Add category selector to the form**

Read the create ad page first. Import `CATEGORIES` from `@/lib/categories`.

Add state: `const [category, setCategory] = useState('');`

Add a "Category" section to the form (above or below the Color Theme picker). Use the same emoji pill style:

```tsx
<div>
  <label className="mb-2 block text-sm font-medium text-[#cad3f5]">Category</label>
  <div className="flex flex-wrap gap-2">
    {CATEGORIES.map((cat) => (
      <button
        key={cat.key}
        type="button"
        onClick={() => setCategory(cat.key)}
        className="rounded-xl px-3 py-1.5 text-xs font-medium transition-all"
        style={{
          background: category === cat.key ? 'linear-gradient(135deg, #a6da95, #8bd5ca)' : 'rgba(30,32,48,0.8)',
          color: category === cat.key ? '#1e2030' : '#b8c0e0',
          border: `1px solid ${category === cat.key ? 'transparent' : 'rgba(202,211,245,0.06)'}`,
          fontFamily: 'var(--font-family-display)',
        }}
      >
        {cat.emoji} {cat.label}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Send category in the publish request**

In the `publish()` function, add `category` to the JSON body:

```typescript
body: JSON.stringify({
  headline,
  subtext: subtext || null,
  brandUrl: brandUrl || null,
  imageUrl,
  colorTheme,
  colorStyle,
  category: category || null,
  tags: tags.length > 0 ? tags : null,
}),
```

- [ ] **Step 3: Commit**

```bash
git add streamads/src/app/\(app\)/create/
git commit -m "feat: add category selector to create ad form"
```
