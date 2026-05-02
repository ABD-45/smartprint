# 📱 Responsive Design Quick Reference

## 🎯 Breakpoints

```css
Mobile:   < 768px   (1 column, bottom nav)
Tablet:   768-1024px (2 columns, bottom nav)
Desktop:  > 1024px   (3-4 columns, sidebar)
```

## 🔧 Common Patterns

### Fluid Typography
```css
font-size: clamp(min, preferred, max);
/* Example: */
h1 { font-size: clamp(1.5rem, 5vw, 2.5rem); }
```

### Responsive Grid
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
```

### Touch Targets
```css
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
}
```

### Prevent iOS Zoom
```css
input {
  font-size: 16px; /* Minimum to prevent zoom */
}
```

### Safe Area Insets
```css
padding-bottom: max(8px, env(safe-area-inset-bottom));
```

## 📐 Layout Classes

### Hide/Show
```css
.hide-mobile { display: none; }
@media (min-width: 768px) {
  .hide-mobile { display: block; }
}

.show-mobile { display: block; }
@media (min-width: 768px) {
  .show-mobile { display: none; }
}
```

### Full Width on Mobile
```css
.btn-mobile-full {
  width: 100%;
}
@media (min-width: 768px) {
  .btn-mobile-full {
    width: auto;
  }
}
```

## 🎨 Component Patterns

### Card Stack
```jsx
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "clamp(12px, 3vw, 24px)"
}}>
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### Responsive Padding
```jsx
<div style={{
  padding: "clamp(16px, 4vw, 32px)"
}}>
  Content
</div>
```

### Flexible Font Size
```jsx
<h1 style={{
  fontSize: "clamp(1.5rem, 5vw, 2.5rem)"
}}>
  Heading
</h1>
```

## 🔍 Testing Commands

### Chrome DevTools
```
F12                  - Open DevTools
Ctrl+Shift+M         - Toggle device toolbar
Ctrl+Shift+R         - Rotate device
Ctrl+Shift+I         - Inspect element
```

### Test Sizes
```
375px  - iPhone SE
390px  - iPhone 12/13
430px  - iPhone 14 Pro Max
768px  - iPad
1024px - iPad Pro
1920px - Desktop
```

## ✅ Quick Checklist

Before deploying:
- [ ] No horizontal scroll
- [ ] All buttons ≥ 44px
- [ ] Text readable
- [ ] Forms usable
- [ ] Navigation works
- [ ] Tested on mobile
- [ ] Tested on tablet
- [ ] Tested on desktop

## 🐛 Common Fixes

### Horizontal Scroll
```css
* { max-width: 100%; }
body { overflow-x: hidden; }
```

### Text Overflow
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

### Small Buttons
```css
min-height: 44px;
padding: 12px 20px;
```

### Keyboard Overlap
```javascript
input.addEventListener('focus', (e) => {
  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
```

## 📱 Navigation Pattern

### Mobile
```jsx
// Hamburger + Bottom Nav
<Navbar /> {/* Hamburger menu */}
<Sidebar className={isOpen ? 'open' : ''} />
<BottomNav /> {/* Fixed bottom */}
```

### Desktop
```jsx
// Sidebar only
<Sidebar /> {/* Fixed left */}
<MainContent />
```

## 🎯 Key Files

```
src/index.css              - Responsive CSS
src/components/Navbar.jsx  - Mobile nav
src/components/Sidebar.jsx - Slide-in sidebar
src/components/JobCard.jsx - Responsive card
```

## 📚 Documentation

```
RESPONSIVE_IMPLEMENTATION.md - Full guide
MOBILE_TESTING_GUIDE.md      - Testing steps
RESPONSIVE_SUMMARY.md        - Overview
RESPONSIVE_QUICK_REF.md      - This file
```

## 🚀 Quick Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Test mobile
# Open http://localhost:5173
# Press Ctrl+Shift+M in Chrome
```

---

**Need help?** Check `RESPONSIVE_IMPLEMENTATION.md` for details.
