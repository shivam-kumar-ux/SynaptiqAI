// js/command-palette.js — Global Command Palette (Ctrl + K) for SYNAPTIQAI

import { dbGetAll } from "./db.js";
import { navigateTo, getRoute } from "./routes.js";

export class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.items = [];
    this.init();
  }

  init() {
    if (document.getElementById("synaptiq-cmd-palette")) return;

    const html = `
      <div id="synaptiq-cmd-palette" class="cmd-palette-backdrop" style="display:none;">
        <div class="cmd-palette-modal">
          <div class="cmd-palette-search">
            <span class="cmd-search-icon">🔍</span>
            <input type="text" id="cmdSearchInput" placeholder="Search topics, plans, quizzes, mistakes, actions... (Press Esc to close)" autocomplete="off">
            <span class="cmd-badge">ESC</span>
          </div>

          <div class="cmd-palette-results" id="cmdResultsList">
            <!-- Dynamic results rendered here -->
          </div>
        </div>
      </div>
    `;

    const div = document.createElement("div");
    div.innerHTML = html;
    document.body.appendChild(div);

    this.injectStyles();
    this.bindGlobalKeys();
  }

  injectStyles() {
    if (document.getElementById("synaptiq-cmd-styles")) return;
    const style = document.createElement("style");
    style.id = "synaptiq-cmd-styles";
    style.innerHTML = `
      .cmd-palette-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(7, 11, 20, 0.8);
        backdrop-filter: blur(12px);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }

      .cmd-palette-modal {
        background: var(--bg-surface, #111827);
        border: 1px solid var(--border-accent, rgba(0, 245, 255, 0.4));
        border-radius: var(--radius-lg, 16px);
        width: 100%;
        max-width: 600px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6), var(--shadow-glow, 0 0 20px rgba(0,245,255,0.15));
        overflow: hidden;
      }

      .cmd-palette-search {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border, #1E293B);
      }

      .cmd-search-icon { font-size: 1.2rem; }

      .cmd-palette-search input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 1.05rem;
        color: var(--text-primary, #F1F5F9);
      }

      .cmd-badge {
        background: var(--bg-secondary, #182235);
        border: 1px solid var(--border, #1E293B);
        padding: 2px 8px;
        border-radius: 4px;
        font-family: var(--font-mono, monospace);
        font-size: 0.75rem;
        color: var(--text-muted, #64748B);
      }

      .cmd-palette-results {
        max-height: 360px;
        overflow-y: auto;
        padding: 8px;
      }

      .cmd-section-title {
        font-family: var(--font-mono, monospace);
        font-size: 0.7rem;
        color: var(--text-muted, #64748B);
        padding: 8px 12px 4px;
        letter-spacing: 1px;
      }

      .cmd-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border-radius: var(--radius-md, 10px);
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .cmd-item:hover, .cmd-item.selected {
        background: var(--bg-secondary, #182235);
      }

      .cmd-item-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .cmd-item-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text-primary, #F1F5F9);
      }

      .cmd-item-subtitle {
        font-size: 0.75rem;
        color: var(--text-secondary, #94A3B8);
      }
    `;
    document.head.appendChild(style);
  }

  bindGlobalKeys() {
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    const backdrop = document.getElementById("synaptiq-cmd-palette");
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this.close();
    });

    const input = document.getElementById("cmdSearchInput");
    input.addEventListener("input", () => this.filterResults(input.value));
  }

  async toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      await this.open();
    }
  }

  async open() {
    this.isOpen = true;
    const modal = document.getElementById("synaptiq-cmd-palette");
    modal.style.display = "flex";

    const input = document.getElementById("cmdSearchInput");
    input.value = "";
    input.focus();

    await this.loadItems();
    this.renderResults(this.items);
  }

  close() {
    this.isOpen = false;
    document.getElementById("synaptiq-cmd-palette").style.display = "none";
  }

  async loadItems() {
    const defaultActions = [
      { icon: "🎯", title: "Start Focus Session", subtitle: "Launch Pomodoro learning timer", action: () => navigateTo("session") },
      { icon: "🧠", title: "Open Knowledge Map", subtitle: "View topic mastery & forgetting risk", action: () => navigateTo("progress") },
      { icon: "🧪", title: "Take Diagnostic Quiz", subtitle: "Test current strengths and weaknesses", action: () => navigateTo("quiz") },
      { icon: "⚠", title: "Review Mistake Bank", subtitle: "Fix conceptual and application errors", action: () => navigateTo("progress") },
      { icon: "⚙️", title: "AI Provider Settings", subtitle: "Configure Gemini, Groq, OpenRouter keys", action: () => navigateTo("settings") }
    ];

    try {
      const plans = await dbGetAll("plans");
      const planItems = (plans || []).map(p => ({
        icon: "📖",
        title: p.subject || p.plan_name || "Study Plan",
        subtitle: `Created: ${p.createdAt ? p.createdAt.split('T')[0] : 'Recent'}`,
        action: () => navigateTo("planView", { id: p.id })
      }));
      this.items = [...defaultActions, ...planItems];
    } catch {
      this.items = defaultActions;
    }
  }

  filterResults(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.renderResults(this.items);
      return;
    }

    const filtered = this.items.filter(item => 
      item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
    this.renderResults(filtered);
  }

  renderResults(list) {
    const container = document.getElementById("cmdResultsList");
    if (!list || list.length === 0) {
      container.innerHTML = `<div class="cmd-section-title">No matching results found</div>`;
      return;
    }

    let html = `<div class="cmd-section-title">QUICK ACTIONS & SEARCH</div>`;
    list.forEach((item, index) => {
      html += `
        <div class="cmd-item ${index === 0 ? 'selected' : ''}" data-index="${index}">
          <div class="cmd-item-left">
            <span style="font-size:1.2rem;">${item.icon}</span>
            <div>
              <div class="cmd-item-title">${item.title}</div>
              <div class="cmd-item-subtitle">${item.subtitle}</div>
            </div>
          </div>
          <span class="cmd-badge">↵ Select</span>
        </div>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll(".cmd-item").forEach((el, idx) => {
      el.addEventListener("click", () => {
        this.close();
        if (list[idx] && list[idx].action) list[idx].action();
      });
    });
  }
}

export const globalCommandPalette = new CommandPalette();
