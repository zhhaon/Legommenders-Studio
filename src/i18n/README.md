# Studio internationalization

Studio supports English (`en`) and Simplified Chinese (`zh-CN`). The language
selector is available in the toolbar and welcome screen. The first visit defaults to English regardless of browser language. A saved
user-selected preference is restored on subsequent visits. Language preferences are separate from Graph JSON and training state.

## Adding a language

1. Add `locales/<language-tag>.json`, using the existing stable translation keys.
2. Import the resource in `index.ts`, register it in `resources`, and add its code,
   native label and text direction to `languages`.
3. Translate whole messages, retaining interpolation placeholders. For count-based
   grammar use i18next plural keys and numeric `count` parameters.
4. Run `npm test` and `npm run build`, then the optional browser acceptance test.
   New scripts should use the installed npm CLI if this server's npm shim is broken.
5. Check long text, panel widths, node measurements, keyboard labels and fonts.
   RTL languages additionally need layout validation before enabling them.

## Adding or editing text

- Use `tr(key, params, englishFallback)` for rendered text. Never translate IDs,
  enum values, parameter keys, filenames, YAML or saved graph contents.
- Use `componentText`, `paramLabel`, `paramDescription` and `categoryLabel` for
  registry metadata. Catalog keys use stable component IDs; parameter labels use
  configuration keys. Unknown automatic components retain backend English.
- Chinese parameter labels have no raw-key suffix. Technical names without a
  suitable translation stay English. Model, dataset and metric names stay English.
- User-authored labels, descriptions and experiment names are preserved.
- `useLocale()` subscribes components and memoized canvas nodes to language changes.
  Include locale in any memo or measurement cache containing displayed text.
- `message(key, params)` retains transient frontend event references while keeping
  English string compatibility with existing store consumers. `text(value)` renders
  those events in the active language. The source index is a compatibility adapter
  for existing fixed event/status strings; use explicit keys for new messages.
- Backend `localized(key, english, params)` preserves English strings and attaches
  language-neutral references. Validation reports include references per message,
  reason and fix; compilation includes `note_translations`; HTTP errors retain
  `detail` and add `translation`. External process logs remain unchanged.
- Keep keys stable when editing wording. Add the same placeholders in each locale.
  The test suite checks placeholder contracts, fallback and metadata preservation.

## Browser acceptance

With the backend serving the current frontend build:

```sh
STUDIO_URL=http://127.0.0.1:8234 \
PLAYWRIGHT_CORE=/path/to/playwright-core \
CHROME_PATH=/path/to/chrome \
node studio/tests/i18n_e2e.cjs
```

The test uses a fresh browser context and verifies live switching, validation,
Chinese parameter labels, bilingual search, unchanged graph semantics and compiled
YAML, language persistence, and absence of JavaScript exceptions. It does not start
training. Screenshots default to `/tmp/studio-i18n-screenshots/`.
