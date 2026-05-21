🎯 What:
Removed the unused `nextTick` import and its redundant `await nextTick()` call from `src/views/ExercisesView.vue`. Also fixed a hidden lint error in `src/composables/__tests__/useNotifications.storage.test.ts` where `notificationService` and `nextTick` were imported but not used, and updated the test to use `flushPromises()` for more robust async state testing.

💡 Why:
The `nextTick` import in `ExercisesView.vue` was unused, adding unnecessary noise to the file. The `await nextTick()` call was redundant because it was immediately followed by a `setTimeout`, which already inherently defers execution and avoids DOM manipulation conflicts. Cleaning up these unused imports and redundant calls improves the codebase's readability and maintainability.

✅ Verification:
- Ran `pnpm run lint` and confirmed that there are zero linting errors across the codebase.
- Ran the full test suite with `pnpm run test:unit`, ensuring all 203 tests successfully pass.
- Inspected the diff to confirm that only the unused parts were modified and no functionality was affected.

✨ Result:
Cleaned up unnecessary `vue` imports and redundant lifecycle calls in `ExercisesView.vue`, and fixed unrelated but hidden lint warnings in `useNotifications.storage.test.ts`, leading to a cleaner and more maintainable project state.
