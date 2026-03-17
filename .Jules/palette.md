## 2025-03-17 - App.vue Global Navigation Accessibility
**Learning:** Native `router-link` tags in Vue don't automatically provide the best semantic markup for screen readers when they wrap images/icons, leading to redundant readouts (e.g., "Profile, User Profile").
**Action:** When creating icon-only `router-link` elements, always add an `aria-label` to the link itself and set the inner image `alt` text to empty `alt=""` to prevent redundant screen reader announcements.
