# HyperVault Investor Website

This is a single-page GitHub Pages website for HyperVault by Askiplex Technologies.

## Files

- `index.html` — full website with inline CSS/JS
- `assets/slides/` — slide images exported from the investor deck
- `assets/img/` — key visuals and favicon
- `assets/video/hypervault-overview.mp4` — short product overview montage generated from the deck
- `assets/docs/HyperVault_Investor_Deck.pdf` — PDF deck download
- `assets/docs/HyperVault_Investor_Deck.pptx` — PPTX deck download
- `.nojekyll` — prevents GitHub Pages from processing files through Jekyll

## Before Publishing

Open `index.html` and update these two lines near the bottom:

```js
const CONTACT_EMAIL = "investors@askiplex.com";
const NEWSLETTER_EMAIL = "investors@askiplex.com";
```

Replace them with the real investor/contact email.

## GitHub Pages Setup

1. Create a new public GitHub repository, for example: `HyperVault`.
2. Upload all extracted files and folders from this package. Do not upload only the ZIP.
3. Ensure `index.html` is in the repository root, not inside an extra folder.
4. Go to **Settings → Pages**.
5. Under **Build and deployment**, select:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Click **Save**.
7. Your website link will look like:

```text
https://YOUR-GITHUB-USERNAME.github.io/HyperVault/
```

## Optional Contact Form Upgrade

The included contact and newsletter forms use `mailto:` because GitHub Pages is static and does not process backend form submissions. For direct web form submissions, connect a service such as Formspree, Netlify Forms, or EmailJS.
