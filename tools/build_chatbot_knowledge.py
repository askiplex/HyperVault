#!/usr/bin/env python3
"""Build the static HyperVault chatbot knowledge index.

The output is consumed directly by chatbot.js on GitHub Pages. It combines:
1. Curated website knowledge.
2. FAQ entries already visible in index.html.
3. Q&A blocks extracted from FAQ and handbook PDFs.
"""

from __future__ import annotations

import bisect
import hashlib
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader  # type: ignore
    except ImportError as exc:
        raise SystemExit(
            "PDF support is missing. Install it with: python -m pip install pypdf"
        ) from exc


ROOT = Path(__file__).resolve().parents[1]
BASE_KNOWLEDGE = ROOT / "assets" / "chatbot" / "base-knowledge.json"
OUTPUT = ROOT / "assets" / "chatbot" / "knowledge.json"
FAQ_HTML = ROOT / "index.html"
PDF_DIRECTORIES = (
    ROOT / "assets" / "downloads",
    ROOT / "assets" / "chatbot" / "faqs",
)

SPACE_RE = re.compile(r"\s+")
QUESTION_RE = re.compile(
    r"\b(?:Q(?P<compact_number>\d{1,3})\.|Question\s+(?P<section_number>\d{1,3}):)\s+",
    re.IGNORECASE,
)
WORD_RE = re.compile(r"[a-z0-9][a-z0-9-]{2,}", re.IGNORECASE)
PAGE_NUMBER_RE = re.compile(r"^\d{1,3}$")

PDF_LABELS = {
    "emergency-intelligence-platform-faq": "Emergency Intelligence Platform FAQ",
    "hypervault-competitive-defense-handbook": "HyperVault Competitive Defense Handbook",
    "HyperVault_Investor_Questionnaire_Q1-Q7": "HyperVault Investor Questionnaire Q1-Q7",
}

STOP_WORDS = {
    "about", "after", "again", "also", "another", "because", "being", "between",
    "could", "does", "from", "have", "into", "itself", "more", "most", "only",
    "other", "should", "their", "there", "these", "they", "this", "through", "what",
    "when", "where", "which", "while", "with", "would", "your"
}


def normalize_text(value: str) -> str:
    replacements = {
        "\u00ad": "",
        "\u00a0": " ",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
    }
    for source, replacement in replacements.items():
        value = value.replace(source, replacement)
    value = SPACE_RE.sub(" ", value)
    value = re.sub(r"\s+([,.;:?!])", r"\1", value)
    return value.strip()


def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def question_keywords(question: str, document_label: str = "") -> list[str]:
    values = WORD_RE.findall(f"{question} {document_label}".lower())
    return sorted({word for word in values if word not in STOP_WORDS})[:24]


class WebsiteFaqParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_item = False
        self.capture: str | None = None
        self.depth = 0
        self.question_parts: list[str] = []
        self.answer_parts: list[str] = []
        self.entries: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = dict(attrs).get("class", "") or ""
        if tag == "details" and "faq-item" in classes.split():
            self.in_item = True
            self.depth = 1
            self.question_parts = []
            self.answer_parts = []
            return

        if not self.in_item:
            return

        if tag == "details":
            self.depth += 1
        elif tag == "summary":
            self.capture = "question"
        elif tag == "p":
            self.capture = "answer"

    def handle_endtag(self, tag: str) -> None:
        if not self.in_item:
            return

        if tag in {"summary", "p"}:
            self.capture = None
        elif tag == "details":
            self.depth -= 1
            if self.depth == 0:
                question = normalize_text(" ".join(self.question_parts))
                answer = normalize_text(" ".join(self.answer_parts))
                if question and answer:
                    self.entries.append((question, answer))
                self.in_item = False

    def handle_data(self, data: str) -> None:
        if not self.in_item or not self.capture:
            return
        if self.capture == "question":
            self.question_parts.append(data)
        else:
            self.answer_parts.append(data)


def load_base_entries() -> list[dict[str, Any]]:
    data = json.loads(BASE_KNOWLEDGE.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError(f"{BASE_KNOWLEDGE} must contain a JSON array")
    return data


def extract_website_faqs() -> list[dict[str, Any]]:
    parser = WebsiteFaqParser()
    parser.feed(FAQ_HTML.read_text(encoding="utf-8"))
    entries: list[dict[str, Any]] = []
    for index, (question, answer) in enumerate(parser.entries, 1):
        entries.append(
            {
                "id": f"website-faq-{index:02d}-{slugify(question)[:54]}",
                "title": question.rstrip("?"),
                "question": question,
                "answer": answer,
                "keywords": question_keywords(question, "HyperVault FAQ"),
                "sourceLabel": "Website FAQs",
                "url": "index.html#faqs",
                "type": "website-faq",
            }
        )
    return entries


def clean_pdf_page(raw_text: str) -> str:
    raw_text = raw_text.replace("-\n", "")
    lines: list[str] = []
    for raw_line in raw_text.splitlines():
        line = normalize_text(raw_line)
        if not line or PAGE_NUMBER_RE.fullmatch(line) or line == "•":
            continue
        lower = line.lower()
        if lower in {
            "hypervault competitive defense handbook",
            "emergency intelligence platform - investor handbook",
        }:
            continue
        if re.match(r"^(part|section|category)\s+[a-z0-9]+\b", lower):
            continue
        lines.append(line)
    return normalize_text(" ".join(lines))


def discover_pdfs() -> list[Path]:
    pdfs: list[Path] = []
    seen_hashes: set[str] = set()
    for directory in PDF_DIRECTORIES:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.pdf"), key=lambda item: item.name.lower()):
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)
            pdfs.append(path)
    return pdfs


def extract_pdf_entries(pdf_path: Path) -> list[dict[str, Any]]:
    reader = PdfReader(str(pdf_path))
    page_starts: list[int] = []
    page_chunks: list[str] = []
    offset = 0

    for page in reader.pages:
        page_starts.append(offset)
        chunk = clean_pdf_page(page.extract_text() or "")
        page_chunks.append(chunk)
        offset += len(chunk) + 1

    document_text = " ".join(page_chunks)
    all_matches = list(QUESTION_RE.finditer(document_text))
    latest_match_by_number: dict[int, re.Match[str]] = {}
    for match in all_matches:
        number = int(match.group("compact_number") or match.group("section_number"))
        latest_match_by_number[number] = match
    matches = sorted(latest_match_by_number.values(), key=lambda match: match.start())
    label = PDF_LABELS.get(pdf_path.stem, normalize_text(pdf_path.stem.replace("-", " ")).title())
    relative_url = pdf_path.relative_to(ROOT).as_posix()
    entries: list[dict[str, Any]] = []

    for index, match in enumerate(matches):
        block_start = match.end()
        block_end = matches[index + 1].start() if index + 1 < len(matches) else len(document_text)
        block = normalize_text(document_text[block_start:block_end])
        question_number = match.group("compact_number") or match.group("section_number")
        is_structured_question = match.group("section_number") is not None

        if is_structured_question:
            subsection = re.search(rf"\s+{int(question_number)}\.\d+(?:\.\d+)*\s+", block)
            if not subsection:
                continue
            heading = normalize_text(block[: subsection.start()])
            instruction = re.search(
                r"\s+(?:Explain|Describe|Highlight|Identify|Target Market|Pitch for Funding|What Sets Your Business Apart)\b",
                heading,
                re.IGNORECASE,
            )
            if instruction:
                heading = heading[: instruction.start()].strip()
            question = f"Question {int(question_number)}: {heading.rstrip('. ')}"
            answer = normalize_text(block[subsection.start() :])
            answer_marker = re.search(r"\bAnswer:\s*", answer, re.IGNORECASE)
            if answer_marker:
                answer = normalize_text(answer[answer_marker.end() :])
        else:
            question_end = block.find("?")
            if question_end < 4:
                continue
            question = normalize_text(block[: question_end + 1])
            answer = normalize_text(block[question_end + 1 :])

        if len(answer) < 24:
            continue

        page_index = max(0, bisect.bisect_right(page_starts, match.start()) - 1)
        page_number = page_index + 1
        entries.append(
            {
                "id": f"pdf-{slugify(pdf_path.stem)}-q{int(question_number):03d}",
                "title": question.rstrip("?"),
                "question": question,
                "answer": answer,
                "keywords": question_keywords(question, label),
                "sourceLabel": f"{label} - Q{question_number}",
                "url": f"{relative_url}#page={page_number}",
                "type": "pdf-faq",
                "document": pdf_path.name,
                "page": page_number,
            }
        )

    return entries


def validate_entries(entries: list[dict[str, Any]]) -> None:
    required = {"id", "title", "question", "answer", "keywords", "sourceLabel", "url", "type"}
    seen: set[str] = set()
    for entry in entries:
        missing = required - entry.keys()
        if missing:
            raise ValueError(f"Knowledge entry is missing {sorted(missing)}: {entry}")
        if entry["id"] in seen:
            raise ValueError(f"Duplicate knowledge id: {entry['id']}")
        seen.add(entry["id"])


def main() -> int:
    base_entries = load_base_entries()
    website_faqs = extract_website_faqs()
    pdfs = discover_pdfs()
    pdf_entries: list[dict[str, Any]] = []
    for pdf in pdfs:
        extracted = extract_pdf_entries(pdf)
        pdf_entries.extend(extracted)
        print(f"Indexed {len(extracted):3d} questions from {pdf.relative_to(ROOT)}")

    entries = base_entries + website_faqs + pdf_entries
    validate_entries(entries)

    payload = {
        "version": 1,
        "entryCount": len(entries),
        "sources": {
            "curatedWebsite": len(base_entries),
            "websiteFaqs": len(website_faqs),
            "pdfFaqs": len(pdf_entries),
            "pdfDocuments": [pdf.relative_to(ROOT).as_posix() for pdf in pdfs],
        },
        "entries": entries,
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(entries)} knowledge entries to {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
