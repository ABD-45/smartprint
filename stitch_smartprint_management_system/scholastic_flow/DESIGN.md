# Design System Strategy: The Architectural Lens

## 1. Overview & Creative North Star

This design system is built upon the Creative North Star of **"The Architectural Lens."** In a high-stakes college environment, print management is often viewed as a utility; we elevate it to a professional service. Optimized for a **light mode** environment, we move away from the "cluttered dashboard" trope and toward a high-end editorial experience that feels structured yet breathable.

By utilizing **intentional asymmetry**—such as off-grid header placements and varying card widths—we guide the user’s eye to what matters most. We reject the "boxed-in" feeling of traditional software. Instead, we use expansive whitespace and high-contrast typography scales to create a sense of authoritative calm. This is efficiency through elegance, not just speed.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule

The palette is segmented by user role to provide immediate cognitive orientation within the **light mode** interface. Students live in a vibrant **Electric Cyan**, Operators in the focused **Deep Teal**, and Admins in the **Cool Slate**.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or subtle tonal transitions.
*   **The Technique:** A `surface-container-low` card should sit on a `surface` background. If an inner element needs prominence, move it to `surface-container-highest`. This creates a natural "valley and peak" visual hierarchy without the visual noise of lines, maintaining a clean, architectural finish in a light theme.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine vellum against a clean, professional workspace.
*   **Layer 1 (The Foundation):** `surface` background derived from the neutral palette (#737782).
*   **Layer 2 (The Canvas):** `surface-container-low` for main content areas.
*   **Layer 3 (The Focus):** `surface-container-highest` for active interactive elements.

### Signature Textures
To add "soul," use subtle gradients for primary CTAs. Instead of a flat cyan, use a linear gradient transitioning from `primary` (#00adc8) to a slightly deeper `primary_container`. This adds a soft volume that feels premium and tactile.

---

## 3. Typography: Editorial Authority

We use a duo-font system to establish hierarchy. **Lexend** provides a geometric, structured authority for headlines, while **Inter** ensures maximum legibility for functional content.

*   **Display & Headline (Lexend):** Use these to ground the page. A `headline-lg` in Lexend should feel like a title in a high-end magazine—bold, spacious, and unapologetic.
*   **Body & Labels (Inter):** In dense data views (queues, logs), use `body-md` for legibility. Reserve `label-md` for metadata, utilizing the `on_surface_variant` to create a clear secondary tier of information.
*   **Tracking:** For `label-sm` and `label-md`, increase letter spacing by 0.02em to ensure "The Architectural Lens" remains legible even at small scales.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are a last resort. Depth in this system is achieved through **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a "lift" that is felt rather than seen.
*   **Ambient Shadows:** If an element must "float" (e.g., a modal or a floating action button), use an extra-diffused shadow. Set the blur to 24px–40px with an opacity of 4%–6%. The shadow color must be a tint of `on_surface`, never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the `outline_variant` at 15% opacity. It should be a suggestion of a border, not a hard stop.
*   **Glassmorphism:** For overlays, use a backdrop-blur (12px–20px) combined with a semi-transparent `surface` color. This allows the primary brand colors to bleed through, softening the edges of the UI.

---

## 5. Components: Precision & State

### Cards & Lists
Cards are the heart of the "Architectural Lens." 
*   **Requirement:** Forbid all divider lines. 
*   **Separation:** Use vertical whitespace (referencing the **subtle roundedness (level 1)** for corners) and background shifts from `surface-container-low` to `surface-container-high` to separate line items. 

### Status Badges (The "Fluid Status" Pattern)
Badges should not be heavy blocks of color.
*   **Uploaded/Queued:** `tertiary_container` text on `tertiary_fixed_dim` background (#5d77ac).
*   **Paid/Done:** `secondary` text on `secondary_container` background (#2c8193).
*   **Printing:** A `primary` gradient pulse with a `surface-container-lowest` glass overlay.

### Real-time Progress Indicators
Move beyond the standard loading bar. Use a "Fluid Pulse"—a thin (4px) track using `primary_fixed` with a high-contrast `primary` (#00adc8) indicator that features a subtle outer glow (the only exception to the "low shadow" rule).

### Buttons
*   **Primary:** Gradient of `primary` (#00adc8) to `primary_container`. No border. Corner radius: **subtle (level 1)**.
*   **Secondary:** `surface-container-high` background with `on_primary_fixed_variant` text.
*   **Tertiary:** Transparent background, `primary` text, with a `surface-variant` background shift on hover.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** embrace asymmetry. If a list is on the left, let the right side have significant negative space for metadata.
*   **Do** use typography (Lexend for headers) to define hierarchy before reaching for a color or a container.
*   **Do** prioritize the `normal` spacing scale (level 2) to maintain the "breathable" editorial feel.
*   **Do** apply **subtle roundedness (level 1)** to all surface containers to emphasize the precise, architectural nature of the light interface.

### Don’t:
*   **Don’t** use 100% opaque, high-contrast borders. They shatter the "Architectural" feel.
*   **Don’t** use generic system colors for success states; always anchor the UI in the specific `primary` (#00adc8) or `secondary` (#2c8193) tokens to maintain the brand's sophisticated palette.
*   **Don’t** crowd the density. Even in data-heavy admin views, prioritize "The Architectural Lens"—give the data room to breathe with the `normal` (level 2) spacing setting.