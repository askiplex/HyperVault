# HyperVault chatbot FAQ sources

Place additional FAQ PDF files in this folder, then rebuild the chatbot knowledge index:

```powershell
python tools/build_chatbot_knowledge.py
```

The builder also reads the existing PDF files in `assets/downloads`. Commit the updated
`assets/chatbot/knowledge.json` with the PDFs so GitHub Pages can serve the new answers.

Scanned image-only PDFs need OCR before they can be indexed. Text-based PDFs are extracted
automatically with `pypdf` (or `PyPDF2` as a fallback).
