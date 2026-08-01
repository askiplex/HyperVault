(function () {
  "use strict";

  if (document.querySelector("[data-hv-chatbot]")) return;

  const activeScript = document.currentScript;
  const scriptUrl = activeScript?.src || new URL("chatbot.js", window.location.href).href;
  const siteRoot = new URL("./", scriptUrl);
  const knowledgeUrl = new URL("assets/chatbot/knowledge.json", siteRoot);
  const historyKey = "hypervault-chat-history-v1";

  const stopWords = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for",
    "from", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "our",
    "that", "the", "their", "this", "to", "us", "was", "we", "what", "when", "where",
    "which", "who", "why", "will", "with", "would", "you", "your"
  ]);

  const aliasGroups = [
    ["duplicate", "duplicates", "dedupe", "deduplication", "clutter", "copies"],
    ["storage", "files", "content", "documents", "photos", "videos", "downloads"],
    ["security", "secure", "protect", "protection", "privacy", "vault", "encryption"],
    ["mobility", "transfer", "transfers", "move", "moving", "share", "sharing"],
    ["wearable", "wearables", "ring", "band", "watch", "keychain", "card"],
    ["emergency", "sos", "panic", "safety", "crisis", "alert", "alerts"],
    ["business", "revenue", "monetization", "pricing", "price", "cost", "subscription", "premium"],
    ["investor", "investment", "funding", "fund", "seed", "capital", "runway"],
    ["request", "requested", "requesting", "requirement", "required", "ask", "asking"],
    ["use", "used", "usage", "allocation", "allocated", "spend", "spending"],
    ["roadmap", "timeline", "milestone", "milestones", "launch", "release"],
    ["ip", "patent", "patents", "defensibility", "moat", "copy", "copying"],
    ["company", "team", "leadership", "founder", "askiplex"],
    ["cloud", "drive", "usb", "sync", "backup"],
    ["download", "available", "availability", "buy", "purchase", "install"],
    ["android", "mobile", "phone", "smartphone", "app"]
  ];

  const fallbackKnowledge = [
    {
      id: "fallback-overview",
      title: "What is HyperVault?",
      question: "What is HyperVault?",
      answer: "HyperVault is an Android-first platform that unifies intelligent storage, contextual security, data mobility, wearable trust, and emergency intelligence.",
      keywords: ["overview", "android", "storage", "security", "mobility", "wearable", "emergency"],
      sourceLabel: "HyperVault Overview",
      url: "index.html",
      type: "fallback"
    },
    {
      id: "fallback-pillars",
      title: "HyperVault technology pillars",
      question: "What are the HyperVault pillars?",
      answer: "The five pillars are Content-Centric Storage Virtualization, Data Deduplication Virtualization, Contextual Security Virtualization, Data Mobility Virtualization, and Wearable Aware Authentication.",
      keywords: ["pillars", "technology", "virtualization", "deduplication", "authentication"],
      sourceLabel: "Technology Pillars",
      url: "deep-dive.html#technology-pillars",
      type: "fallback"
    },
    {
      id: "fallback-contact",
      title: "Contact HyperVault",
      question: "How can I contact HyperVault?",
      answer: "Use the contact form on the Overview page for product, partnership, investor, or general enquiries.",
      keywords: ["contact", "email", "enquiry", "partnership", "investor"],
      sourceLabel: "Contact HyperVault",
      url: "index.html#contact",
      type: "fallback"
    }
  ];

  const suggestedQuestions = [
    "What is HyperVault?",
    "How does duplicate virtualization work?",
    "How do wearables improve trust?",
    "What is the business model?"
  ];

  const chatbot = document.createElement("div");
  chatbot.className = "hv-chatbot";
  chatbot.dataset.hvChatbot = "";
  chatbot.innerHTML = `
    <button class="hv-chat-launcher" type="button" aria-expanded="false" aria-controls="hvChatPanel" title="Ask HyperVault">
      <span class="hv-chat-launcher-mark" aria-hidden="true">
        <img src="${new URL("assets/hypervault-logo-mark.png", siteRoot).href}" alt="" />
      </span>
      <span class="hv-chat-launcher-label">Ask HyperVault</span>
      <span class="hv-chat-launcher-pulse" aria-hidden="true"></span>
    </button>
    <section class="hv-chat-panel" id="hvChatPanel" role="dialog" aria-label="HyperVault Assistant" hidden>
      <header class="hv-chat-header">
        <span class="hv-chat-avatar" aria-hidden="true">
          <img src="${new URL("assets/hypervault-logo-mark.png", siteRoot).href}" alt="" />
        </span>
        <span class="hv-chat-heading">
          <strong>HyperVault Assistant</strong>
          <small><i aria-hidden="true"></i><span data-chat-status>Loading knowledge...</span></small>
        </span>
        <button class="hv-chat-close" type="button" aria-label="Close HyperVault Assistant" title="Close">&times;</button>
      </header>
      <div class="hv-chat-context">
        <span>Grounded in the HyperVault website and FAQ library</span>
      </div>
      <div class="hv-chat-messages" data-chat-messages role="log" aria-live="polite" aria-relevant="additions"></div>
      <div class="hv-chat-suggestions" data-chat-suggestions aria-label="Suggested questions"></div>
      <form class="hv-chat-form" data-chat-form>
        <label class="sr-only" for="hvChatInput">Ask a question about HyperVault</label>
        <textarea id="hvChatInput" data-chat-input rows="1" maxlength="280" placeholder="Ask about products, security, wearables..." required></textarea>
        <button type="submit" data-chat-send aria-label="Send question" title="Send question">&uarr;</button>
      </form>
      <p class="hv-chat-disclaimer">Answers summarize published HyperVault material. Verify investment, safety, and product decisions with the team.</p>
    </section>
  `;
  document.body.appendChild(chatbot);

  const launcher = chatbot.querySelector(".hv-chat-launcher");
  const panel = chatbot.querySelector(".hv-chat-panel");
  const closeButton = chatbot.querySelector(".hv-chat-close");
  const messages = chatbot.querySelector("[data-chat-messages]");
  const suggestions = chatbot.querySelector("[data-chat-suggestions]");
  const form = chatbot.querySelector("[data-chat-form]");
  const input = chatbot.querySelector("[data-chat-input]");
  const sendButton = chatbot.querySelector("[data-chat-send]");
  const status = chatbot.querySelector("[data-chat-status]");

  let knowledge = [];
  let knowledgeReady = false;
  let conversation = loadHistory();

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function tokenize(value) {
    return normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !stopWords.has(token));
  }

  function expandTokens(tokens) {
    const expanded = new Set(tokens);
    aliasGroups.forEach((group) => {
      if (group.some((term) => expanded.has(term))) {
        group.forEach((term) => expanded.add(term));
      }
    });
    return [...expanded];
  }

  function prepareEntry(entry) {
    const keywords = Array.isArray(entry.keywords) ? entry.keywords.join(" ") : "";
    const title = normalize(entry.title || "");
    const question = normalize(entry.question || "");
    const primary = normalize(`${title} ${question}`);
    return {
      ...entry,
      _title: title,
      _question: question,
      _primary: primary,
      _keywords: normalize(keywords),
      _answer: normalize(entry.answer || ""),
      _tokens: new Set(tokenize(`${primary} ${keywords}`))
    };
  }

  function includesTerm(text, term) {
    return (` ${text} `).includes(` ${term} `);
  }

  function findMatches(query, limit = 3) {
    const normalizedQuery = normalize(query);
    const originalTokens = tokenize(query);
    const queryTokens = expandTokens(originalTokens);
    const bigrams = originalTokens.slice(0, -1).map((token, index) => `${token} ${originalTokens[index + 1]}`);
    const activeAliasGroups = aliasGroups.filter((group) => group.some((term) => originalTokens.includes(term)));

    return knowledge
      .map((entry) => {
        let score = 0;
        let directMatches = 0;

        if (entry._question === normalizedQuery) score += 140;
        if (entry._title === normalizedQuery) score += 120;
        if (normalizedQuery.length > 5 && entry._primary.includes(normalizedQuery)) score += 34;
        if (entry._primary.includes(normalizedQuery.replace(/^(tell me about|explain|describe) /, ""))) score += 18;

        originalTokens.forEach((token) => {
          if (includesTerm(entry._primary, token)) {
            score += 12;
            directMatches += 1;
          } else if (includesTerm(entry._keywords, token)) {
            score += 8;
            directMatches += 1;
          } else if (includesTerm(entry._answer, token)) {
            score += 2;
            directMatches += 1;
          }
        });

        queryTokens.forEach((token) => {
          if (originalTokens.includes(token)) return;
          if (entry._tokens.has(token)) score += 1.25;
        });

        activeAliasGroups.forEach((group) => {
          if (group.some((term) => entry._tokens.has(term))) score += 12;
        });

        bigrams.forEach((bigram) => {
          if (entry._primary.includes(bigram)) score += 15;
          else if (entry._answer.includes(bigram)) score += 5;
        });

        if (originalTokens.length && directMatches === originalTokens.length) score += 16;
        if (entry.type === "website" || entry.type === "website-faq") score += 2;

        return { entry, score, directMatches };
      })
      .filter((match) => match.score >= 7 && match.directMatches > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, limit);
  }

  function conciseAnswer(value, maximum = 1100) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (text.length <= maximum) return text;
    const candidate = text.slice(0, maximum + 1);
    const sentenceEnd = Math.max(candidate.lastIndexOf(". "), candidate.lastIndexOf("? "), candidate.lastIndexOf("! "));
    const cut = sentenceEnd > maximum * 0.55 ? sentenceEnd + 1 : candidate.lastIndexOf(" ");
    return `${candidate.slice(0, Math.max(cut, maximum * 0.6)).trim()}...`;
  }

  function appendInlineFormatting(target, value) {
    const text = String(value || "");
    const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let cursor = 0;

    text.replace(tokenPattern, (token, _capture, offset) => {
      if (offset > cursor) target.append(document.createTextNode(text.slice(cursor, offset)));
      if (token.startsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = token.slice(2, -2);
        target.appendChild(strong);
      } else {
        const code = document.createElement("code");
        code.textContent = token.slice(1, -1);
        target.appendChild(code);
      }
      cursor = offset + token.length;
      return token;
    });

    if (cursor < text.length) target.append(document.createTextNode(text.slice(cursor)));
  }

  function appendRichLine(target, value) {
    const text = String(value || "").trim();
    const labelMatch = text.match(/^([^:]{2,58}):\s*(.+)$/);
    if (!labelMatch) {
      appendInlineFormatting(target, text);
      return;
    }

    const strong = document.createElement("strong");
    strong.textContent = `${labelMatch[1].trim()}:`;
    target.append(strong, document.createTextNode(" "));
    appendInlineFormatting(target, labelMatch[2].trim());
  }

  function appendIntroBlock(container, value) {
    const text = String(value || "").trim();
    if (!text) return;
    const sectionMatch = text.match(/^\d+(?:\.\d+)+\s+(.+)$/);
    const headingLike = sectionMatch?.[1] || text;
    const isHeading = headingLike.length <= 90 && !/[.!?]$/.test(headingLike);
    const element = document.createElement(isHeading ? "h5" : "p");
    appendRichLine(element, sectionMatch ? headingLike : text);
    container.appendChild(element);
  }

  function findNumberedItems(value) {
    const text = String(value || "");
    const pattern = /(?:^|\s)(\d{1,2}[.)])\s+(?=[A-Z])/g;
    const markers = [...text.matchAll(pattern)];
    if (markers.length < 2) return null;

    return {
      intro: text.slice(0, markers[0].index).trim(),
      items: markers.map((marker, index) => {
        const start = marker.index + marker[0].length;
        const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
        return text.slice(start, end).trim();
      }).filter(Boolean)
    };
  }

  function renderRichAnswer(bubble, text, heading) {
    const content = document.createElement("div");
    content.className = "hv-chat-rich-text";

    if (heading) {
      const title = document.createElement("h4");
      title.textContent = heading;
      content.appendChild(title);
    }

    const cleanText = String(text || "").replace(/\s+/g, " ").trim();
    const bulletParts = cleanText.split(/\s*•\s*/).filter(Boolean);
    const numbered = findNumberedItems(cleanText);

    if (bulletParts.length > 1) {
      const intro = bulletParts.shift();
      appendIntroBlock(content, intro);
      const list = document.createElement("ul");
      bulletParts.forEach((item) => {
        const listItem = document.createElement("li");
        appendRichLine(listItem, item);
        list.appendChild(listItem);
      });
      content.appendChild(list);
    } else if (numbered) {
      appendIntroBlock(content, numbered.intro);
      const list = document.createElement("ol");
      numbered.items.forEach((item) => {
        const listItem = document.createElement("li");
        appendRichLine(listItem, item);
        list.appendChild(listItem);
      });
      content.appendChild(list);
    } else {
      const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
      for (let index = 0; index < sentences.length; index += 2) {
        const paragraph = document.createElement("p");
        appendRichLine(paragraph, sentences.slice(index, index + 2).join(" ").trim());
        content.appendChild(paragraph);
      }
    }

    bubble.appendChild(content);
  }

  function sourceUrl(source) {
    try {
      return new URL(source.url, siteRoot).href;
    } catch {
      return new URL("index.html", siteRoot).href;
    }
  }

  function addMessage(role, text, sources = [], persist = true, heading = "") {
    const row = document.createElement("article");
    row.className = `hv-chat-message hv-chat-message-${role}`;

    const bubble = document.createElement("div");
    bubble.className = "hv-chat-bubble";
    if (role === "assistant") {
      renderRichAnswer(bubble, text, heading);
    } else {
      const copy = document.createElement("p");
      copy.textContent = text;
      bubble.appendChild(copy);
    }

    if (sources.length) {
      const sourceList = document.createElement("div");
      sourceList.className = "hv-chat-sources";
      const label = document.createElement("span");
      label.textContent = sources.length > 1 ? "Sources" : "Source";
      sourceList.appendChild(label);

      const seen = new Set();
      sources.forEach((source) => {
        const href = sourceUrl(source);
        if (seen.has(href)) return;
        seen.add(href);
        const link = document.createElement("a");
        link.href = href;
        link.textContent = source.sourceLabel || source.title || "Learn more";
        link.target = href.includes(".pdf") ? "_blank" : "_self";
        if (link.target === "_blank") link.rel = "noopener";
        sourceList.appendChild(link);
      });
      bubble.appendChild(sourceList);
    }

    row.appendChild(bubble);
    messages.appendChild(row);
    if (role === "assistant") {
      const messageTop = row.getBoundingClientRect().top;
      const viewportTop = messages.getBoundingClientRect().top;
      messages.scrollTop = Math.max(0, messages.scrollTop + messageTop - viewportTop - 8);
    } else {
      messages.scrollTop = messages.scrollHeight;
    }

    if (persist) {
      conversation.push({
        role,
        text,
        heading,
        sources: sources.map((source) => ({
          title: source.title,
          sourceLabel: source.sourceLabel,
          url: source.url
        }))
      });
      conversation = conversation.slice(-14);
      saveHistory();
    }
  }

  function showTyping() {
    const row = document.createElement("article");
    row.className = "hv-chat-message hv-chat-message-assistant hv-chat-typing-row";
    row.innerHTML = '<div class="hv-chat-bubble hv-chat-typing" aria-label="HyperVault Assistant is preparing an answer"><i></i><i></i><i></i></div>';
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function answerQuestion(query) {
    const matches = findMatches(query, 3);
    if (!matches.length) {
      return {
        heading: "No grounded answer found",
        text: "I could not find a reliable answer to that in the published HyperVault material. Try asking about the product pillars, Android app, wearables, emergency intelligence, business model, roadmap, or intellectual property.",
        sources: []
      };
    }

    const top = matches[0];
    const sources = matches
      .filter((match, index) => index === 0 || match.score >= top.score * 0.62)
      .map((match) => match.entry);

    return {
      heading: top.entry.title,
      text: conciseAnswer(top.entry.answer),
      sources
    };
  }

  function renderSuggestions(items = suggestedQuestions) {
    suggestions.replaceChildren();
    items.forEach((question) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = question;
      button.addEventListener("click", () => submitQuestion(question));
      suggestions.appendChild(button);
    });
  }

  function submitQuestion(value) {
    const question = String(value || "").trim();
    if (!question) return;

    addMessage("user", question);
    input.value = "";
    resizeInput();
    sendButton.disabled = true;
    const typing = showTyping();

    window.setTimeout(() => {
      typing.remove();
      const response = answerQuestion(question);
      addMessage("assistant", response.text, response.sources, true, response.heading);
      sendButton.disabled = false;
      input.focus();
    }, knowledgeReady ? 360 : 180);
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 96)}px`;
  }

  function openChat() {
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    chatbot.classList.add("is-open");
    window.setTimeout(() => input.focus(), 60);
  }

  function closeChat() {
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    chatbot.classList.remove("is-open");
    launcher.focus();
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(historyKey) || "[]");
      return Array.isArray(stored) ? stored.slice(-14) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      window.sessionStorage.setItem(historyKey, JSON.stringify(conversation));
    } catch {
      // Session history is optional; the assistant remains functional without it.
    }
  }

  function renderHistory() {
    if (!conversation.length) {
      addMessage(
        "assistant",
        "Hello. I can answer questions about HyperVault products, technology, security, wearables, business strategy, and the detailed FAQ handbooks.",
        [],
        false,
        "How can I help?"
      );
      return;
    }
    conversation.forEach((message) => addMessage(
      message.role,
      message.text,
      message.sources || [],
      false,
      message.heading || ""
    ));
  }

  async function loadKnowledge() {
    try {
      const response = await fetch(knowledgeUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Knowledge request failed: ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.entries) || !payload.entries.length) throw new Error("Knowledge index is empty");
      knowledge = payload.entries.map(prepareEntry);
      knowledgeReady = true;
      status.textContent = `${payload.entryCount || knowledge.length} grounded answers ready`;
    } catch (error) {
      knowledge = fallbackKnowledge.map(prepareEntry);
      knowledgeReady = true;
      status.textContent = "Website answers ready";
      console.warn("HyperVault chatbot loaded its compact fallback knowledge.", error);
    }
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openChat();
    else closeChat();
  });
  closeButton.addEventListener("click", closeChat);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion(input.value);
  });

  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });

  renderHistory();
  renderSuggestions();
  loadKnowledge();
})();
