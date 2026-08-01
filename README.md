# HyperVault Modern Website

Run the site through a local web server so browser-loaded knowledge files work correctly:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/index.html`.

Included:
- Responsive single-page website
- Modern visual styling
- Hero section, product sections, roadmap, business model, investor snapshot and contact section
- Auto-playing carousels with controls
- Scroll reveal animations
- Interactive tilt effect on the hero visual
- Grounded HyperVault assistant available across the website
- All provided HyperVault images copied into `/assets`

## Chatbot knowledge

The chatbot uses `assets/chatbot/knowledge.json`, generated from:

- Curated website answers in `assets/chatbot/base-knowledge.json`
- Visible section content from every substantive HyperVault HTML page
- FAQ items displayed in `index.html`
- PDF handbooks in `assets/downloads`
- Additional FAQ PDFs placed in `assets/chatbot/faqs`

After changing website content or adding/replacing a PDF, rebuild the knowledge index:

```powershell
python tools/build_chatbot_knowledge.py
```

Install `pypdf` first if the command reports that PDF support is missing:

```powershell
python -m pip install pypdf
```

To deploy:
1. Upload the folder contents to GitHub Pages, Netlify, Vercel, or any static hosting provider.
2. Keep `index.html`, `style.css`, `script.js`, `chatbot.js`, and the `assets` folder together.
