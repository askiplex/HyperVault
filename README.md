# HyperVault Investor Website

This package is ready for GitHub Pages.

## Upload steps
1. Create a public GitHub repository, for example `HyperVault`.
2. Upload all extracted files and folders: `index.html`, `.nojekyll`, `assets/`, and `README.md`.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select branch **main** and folder **/ root**.
6. Save and wait for GitHub to publish the page.

Your site link will look like:
`https://YOUR-GITHUB-USERNAME.github.io/HyperVault/`

## Contact email
The website contact and newsletter forms use `mailto:` because GitHub Pages is static.
To update the email, open `index.html` and change:

```js
const CONTACT_EMAIL='dsalinkdev@gmail.com';
```

## Demo video
The Product Demo section includes a dynamic demo modal. Replace it later with an actual MP4 or embedded product walkthrough video if available.
