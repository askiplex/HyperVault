#!/usr/bin/env python3
"""Build the static HyperVault chatbot knowledge index.

The output is consumed directly by chatbot.js on GitHub Pages. It combines:
1. Curated website knowledge.
2. Visible content extracted from every substantive website page.
3. FAQ entries already visible in index.html.
4. Q&A blocks extracted from FAQ and handbook PDFs.
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
EXCLUDED_WEBSITE_PAGES = {"evolution.html", "thanks.html"}
WEBSITE_PAGES = tuple(
    page for page in sorted(ROOT.glob("*.html"))
    if page.name not in EXCLUDED_WEBSITE_PAGES
)
WEBSITE_LABELS = {
    "index.html": "HyperVault Overview and Products",
    "business.html": "HyperVault Business",
    "deep-dive.html": "HyperVault Deep Dive",
    "about.html": "About HyperVault",
    "roadmap.html": "HyperVault Roadmap and Timeline",
    "leadership.html": "HyperVault Leadership Team",
    "ip.html": "HyperVault Intellectual Property",
}
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
    keywords: list[str] = []
    seen: set[str] = set()
    for word in values:
        if word in STOP_WORDS or word in seen:
            continue
        seen.add(word)
        keywords.append(word)
        if len(keywords) == 30:
            break
    return keywords


def chunk_text(value: str, maximum: int = 1200) -> list[str]:
    value = normalize_text(value)
    if len(value) <= maximum:
        return [value] if value else []

    sentences = re.split(r"(?<=[.!?])\s+", value)
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if len(sentence) > maximum:
            words = sentence.split()
            for word in words:
                candidate = f"{current} {word}".strip()
                if current and len(candidate) > maximum:
                    chunks.append(current)
                    current = word
                else:
                    current = candidate
            continue

        candidate = f"{current} {sentence}".strip()
        if current and len(candidate) > maximum:
            chunks.append(current)
            current = sentence
        else:
            current = candidate

    if current:
        chunks.append(current)
    return chunks


class WebsiteSectionParser(HTMLParser):
    """Collect visible page text in section and heading-sized knowledge blocks."""

    SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "footer", "form", "template", "button"}
    HEADING_TAGS = {"h1", "h2", "h3", "h4"}

    def __init__(self) -> None:
        super().__init__()
        self.sections: list[dict[str, Any]] = []
        self.completed: list[dict[str, Any]] = []
        self.skip_depth = 0
        self.skip_tag: str | None = None
        self.heading_tag: str | None = None

    @staticmethod
    def finish_segment(section: dict[str, Any]) -> None:
        heading = normalize_text(" ".join(section["heading_parts"]))
        body = normalize_text(" ".join(section["body_parts"]))
        if heading or body:
            section["segments"].append((heading, body))
        section["heading_parts"] = []
        section["body_parts"] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if self.skip_depth:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        if tag in self.SKIP_TAGS:
            self.skip_depth = 1
            self.skip_tag = tag
            return

        attributes = dict(attrs)
        if tag == "section":
            classes = (attributes.get("class") or "").split()
            section_id = attributes.get("id") or attributes.get("aria-labelledby") or ""
            self.sections.append(
                {
                    "id": section_id,
                    "classes": classes,
                    "segments": [],
                    "heading_parts": [],
                    "body_parts": [],
                }
            )
            return

        if not self.sections or tag not in self.HEADING_TAGS:
            return

        section = self.sections[-1]
        self.finish_segment(section)
        if not section["id"] and attributes.get("id"):
            section["id"] = attributes["id"]
        self.heading_tag = tag

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self.skip_depth:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if not self.skip_depth:
                    self.skip_tag = None
            return
        if tag == self.heading_tag:
            self.heading_tag = None
            return
        if tag == "section" and self.sections:
            section = self.sections.pop()
            self.finish_segment(section)
            self.completed.append(section)

    def handle_data(self, data: str) -> None:
        if self.skip_depth or not self.sections:
            return
        text = normalize_text(data)
        if not text:
            return
        target = self.sections[-1]
        if self.heading_tag:
            target["heading_parts"].append(text)
        else:
            target["body_parts"].append(text)


def extract_website_content() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen_content: set[str] = set()

    for page in WEBSITE_PAGES:
        parser = WebsiteSectionParser()
        parser.feed(page.read_text(encoding="utf-8"))
        page_label = WEBSITE_LABELS.get(
            page.name,
            normalize_text(page.stem.replace("-", " ")).title(),
        )
        page_count = 0

        for section_index, section in enumerate(parser.completed, 1):
            section_id = section["id"]
            if page.name == "index.html" and section_id == "faqs":
                continue

            fallback_title = page_label
            for segment_index, (heading, body) in enumerate(section["segments"], 1):
                title = heading or fallback_title
                content = body or heading
                if len(content) < 28:
                    continue

                content_hash = hashlib.sha256(
                    normalize_text(f"{title} {content}").lower().encode("utf-8")
                ).hexdigest()
                if content_hash in seen_content:
                    continue
                seen_content.add(content_hash)

                chunks = chunk_text(content)
                for part_index, chunk in enumerate(chunks, 1):
                    part_label = f" - Part {part_index}" if len(chunks) > 1 else ""
                    anchor = f"#{section_id}" if section_id else ""
                    question = f"What does HyperVault explain about {title}?"
                    entries.append(
                        {
                            "id": (
                                f"page-{page.stem}-{section_index:02d}-{segment_index:02d}"
                                f"-part-{part_index:02d}-{slugify(title)[:42]}"
                            ),
                            "title": f"{title}{part_label}",
                            "question": question,
                            "answer": chunk,
                            "keywords": question_keywords(f"{title} {chunk[:500]}", page_label),
                            "sourceLabel": f"{page_label} - {title}",
                            "url": f"{page.name}{anchor}",
                            "type": "website-page",
                            "document": page.name,
                            "section": section_id,
                        }
                    )
                    page_count += 1

        print(f"Indexed {page_count:3d} content blocks from {page.name}")

    return entries


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
        source_path = str(entry["url"]).split("#", 1)[0]
        if source_path and "://" not in source_path and not (ROOT / source_path).is_file():
            raise ValueError(f"Knowledge source does not exist: {source_path}")


def main() -> int:
    base_entries = load_base_entries()
    website_content = extract_website_content()
    website_faqs = extract_website_faqs()
    pdfs = discover_pdfs()
    pdf_entries: list[dict[str, Any]] = []
    for pdf in pdfs:
        extracted = extract_pdf_entries(pdf)
        pdf_entries.extend(extracted)
        print(f"Indexed {len(extracted):3d} questions from {pdf.relative_to(ROOT)}")

    entries = base_entries + website_content + website_faqs + pdf_entries
    validate_entries(entries)

    payload = {
        "version": 1,
        "entryCount": len(entries),
        "sources": {
            "curatedWebsite": len(base_entries),
            "websiteContent": len(website_content),
            "websitePages": [page.relative_to(ROOT).as_posix() for page in WEBSITE_PAGES],
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
