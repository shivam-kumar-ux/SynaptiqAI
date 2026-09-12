// js/timer-floating.js — Floating Smart Pomodoro & Focus Session Manager for SYNAPTIQAI

import { FocusTracker, saveFocusSession, getDistractionIntelligence } from "./focus.js";
import { getCurrentUser } from "./auth.js";

const TIMER_STORAGE_KEY = "synaptiq_active_timer_session";

export class FloatingTimerManager {
  constructor() {
    this.state = "IDLE"; // IDLE, FOCUSING, PAUSED, BREAK, COMPLETED
    this.focusTracker = null;
    this.topicName = "General Study";
    this.plannedMinutes = 25;
    this.breakMinutes = 5;
    this.remainingSeconds = 25 * 60;
    this.timerInterval = null;
    this.isMinimized = false;
    this.containerEl = null;

    this.initUI();
    this.restoreSession();
  }

  initUI() {
    if (document.getElementById("synaptiq-floating-timer")) return;

    const widgetHtml = `
      <div id="synaptiq-floating-timer" class="floating-timer-widget timer-minimized" style="display:none;">
        <div class="timer-handle" id="timerHandle">
          <span class="timer-status-dot">●</span>
          <span class="timer-time" id="timerTime">25:00</span>
          <span class="timer-label" id="timerTopicLabel">Focus Session</span>
          <button class="timer-toggle-btn" id="timerToggleExpand" title="Expand/Collapse">⤢</button>
        </div>
        
        <div class="timer-expanded-panel" id="timerExpandedPanel">
          <div class="timer-header">
            <span class="timer-topic" id="timerExpandedTopic">Normalization</span>
            <span class="timer-badge" id="timerStateBadge">FOCUSING</span>
          </div>
          
          <div class="timer-progress-ring-wrap">
            <svg class="timer-ring" width="120" height="120">
              <circle class="timer-ring-bg" cx="60" cy="60" r="52"></circle>
              <circle class="timer-ring-fill" id="timerRingFill" cx="60" cy="60" r="52"></circle>
            </svg>
            <div class="timer-ring-content">
              <div class="timer-large-time" id="timerLargeTime">25:00</div>
              <div class="timer-sub-text" id="timerSubText">Remaining</div>
            </div>
          </div>

          <div class="timer-controls">
            <button class="btn btn-sm btn-primary" id="timerBtnPause">Pause</button>
            <button class="btn btn-sm btn-secondary" id="timerBtnEnd">End Session</button>
          </div>
        </div>
      </div>

      <div id="synaptiq-break-overlay" class="break-overlay" style="display:none;">
        <div class="break-overlay-card">
          <div class="break-icon">☕</div>
          <h2>FOCUS SESSION COMPLETE!</h2>
          <p id="breakStatsSummary">You completed 25 minutes of deep focus with 92% observed focus score.</p>
          
          <div class="break-timer-display" id="breakTimerDisplay">05:00</div>
          <p class="break-tips">💧 Drink water &nbsp;•&nbsp; 🚶 Stretch around &nbsp;•&nbsp; 👀 Rest your eyes</p>
          
          <div class="break-actions">
            <button class="btn btn-primary" id="breakBtnSkip">Skip Break & Continue</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement("div");
    div.innerHTML = widgetHtml;
    document.body.appendChild(div);

    this.containerEl = document.getElementById("synaptiq-floating-timer");
    this.bindEvents();
    this.injectStyles();
  }

  injectStyles() {
    if (document.getElementById("synaptiq-timer-styles")) return;
    const style = document.createElement("style");
    style.id = "synaptiq-timer-styles";
    style.innerHTML = `
      .floating-timer-widget {
        position: fixed;
        top: 80px;
        left: 24px;
        z-index: 9999;
        background: var(--bg-surface, #111827);
        border: 1px solid var(--border-accent, rgba(0, 245, 255, 0.4));
        border-radius: var(--radius-lg, 16px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.5), var(--shadow-glow, 0 0 20px rgba(0,245,255,0.15));
        backdrop-filter: blur(16px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        width: 280px;
        overflow: hidden;
      }

      .floating-timer-widget.timer-minimized {
        width: auto;
        padding: 8px 14px;
        border-radius: 999px;
      }

      .timer-handle {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }

      .timer-status-dot {
        color: var(--accent-primary, #00F5FF);
        font-size: 1rem;
        animation: timerPulse 1.5s infinite;
      }

      @keyframes timerPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      .timer-time {
        font-family: var(--font-mono, monospace);
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--text-primary, #F1F5F9);
      }

      .timer-label {
        font-size: 0.8rem;
        color: var(--text-secondary, #94A3B8);
        max-width: 110px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .floating-timer-widget.timer-minimized .timer-expanded-panel {
        display: none;
      }

      .timer-expanded-panel {
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }

      .timer-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .timer-topic {
        font-weight: 700;
        font-size: 0.9rem;
        color: var(--text-primary, #F1F5F9);
      }

      .timer-progress-ring-wrap {
        position: relative;
        width: 120px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .timer-ring-bg {
        fill: none;
        stroke: var(--bg-elevated, #182235);
        stroke-width: 8;
      }

      .timer-ring-fill {
        fill: none;
        stroke: var(--accent-primary, #00F5FF);
        stroke-width: 8;
        stroke-dasharray: 326;
        stroke-dashoffset: 0;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        transition: stroke-dashoffset 0.5s ease;
      }

      .timer-ring-content {
        position: absolute;
        text-align: center;
      }

      .timer-large-time {
        font-family: var(--font-mono, monospace);
        font-size: 1.4rem;
        font-weight: 700;
        color: var(--accent-primary, #00F5FF);
      }

      .timer-sub-text {
        font-size: 0.7rem;
        color: var(--text-muted, #64748B);
      }

      .timer-controls {
        display: flex;
        gap: 10px;
        width: 100%;
      }

      .timer-controls button {
        flex: 1;
      }

      /* Break Overlay */
      .break-overlay {
        position: fixed;
        inset: 0;
        background: rgba(7, 11, 20, 0.9);
        backdrop-filter: blur(16px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }

      .break-overlay-card {
        background: var(--bg-surface, #111827);
        border: 1px solid var(--border-accent, rgba(0, 245, 255, 0.4));
        border-radius: var(--radius-xl, 24px);
        padding: 36px;
        max-width: 440px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      }

      .break-icon { font-size: 3rem; margin-bottom: 12px; }
      .break-timer-display {
        font-family: var(--font-mono, monospace);
        font-size: 3rem;
        font-weight: 800;
        color: var(--accent-primary, #00F5FF);
        margin: 20px 0;
      }
      .break-tips { font-size: 0.85rem; color: var(--text-secondary, #94A3B8); margin-bottom: 24px; }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    const handle = document.getElementById("timerHandle");
    handle.addEventListener("click", () => this.toggleMinimize());

    document.getElementById("timerBtnPause").addEventListener("click", () => this.togglePause());
    document.getElementById("timerBtnEnd").addEventListener("click", () => this.endSession());
    document.getElementById("breakBtnSkip").addEventListener("click", () => this.closeBreak());
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.isMinimized) {
      this.containerEl.classList.add("timer-minimized");
    } else {
      this.containerEl.classList.remove("timer-minimized");
    }
  }

  startActivityTimer(topicName = "Learning Topic", minutes = 25, breakMins = 5) {
    this.topicName = topicName;
    this.plannedMinutes = minutes;
    this.breakMinutes = breakMins;
    this.remainingSeconds = minutes * 60;
    this.state = "FOCUSING";

    this.focusTracker = new FocusTracker(minutes);
    this.focusTracker.start();

    this.containerEl.style.display = "block";
    document.getElementById("timerTopicLabel").textContent = topicName;
    document.getElementById("timerExpandedTopic").textContent = topicName;

    this.runTick();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tick(), 1000);
    this.persistState();
  }

  tick() {
    if (this.state !== "FOCUSING") return;
    if (this.remainingSeconds > 0) {
      this.remainingSeconds -= 1;
      this.runTick();
      this.persistState();
    } else {
      this.completeFocusSession();
    }
  }

  runTick() {
    const m = Math.floor(this.remainingSeconds / 60).toString().padStart(2, '0');
    const s = (this.remainingSeconds % 60).toString().padStart(2, '0');
    const timeStr = `${m}:${s}`;

    document.getElementById("timerTime").textContent = timeStr;
    document.getElementById("timerLargeTime").textContent = timeStr;

    // Progress Ring offset calculation (326 is perimeter)
    const totalSecs = this.plannedMinutes * 60;
    const progressRatio = (totalSecs - this.remainingSeconds) / totalSecs;
    const offset = 326 * (1 - progressRatio);
    document.getElementById("timerRingFill").style.strokeDashoffset = offset;
  }

  togglePause() {
    if (this.state === "FOCUSING") {
      this.state = "PAUSED";
      if (this.focusTracker) this.focusTracker.pause();
      document.getElementById("timerBtnPause").textContent = "Resume";
      document.getElementById("timerStateBadge").textContent = "PAUSED";
    } else if (this.state === "PAUSED") {
      this.state = "FOCUSING";
      if (this.focusTracker) this.focusTracker.resume();
      document.getElementById("timerBtnPause").textContent = "Pause";
      document.getElementById("timerStateBadge").textContent = "FOCUSING";
    }
    this.persistState();
  }

  async completeFocusSession() {
    this.state = "BREAK";
    if (this.timerInterval) clearInterval(this.timerInterval);

    const stats = this.focusTracker ? this.focusTracker.stop() : {};
    await saveFocusSession("local_user", {
      topic: this.topicName,
      ...stats
    });

    document.getElementById("breakStatsSummary").textContent = 
      `You completed ${this.plannedMinutes} minutes of deep focus on ${this.topicName} with ${stats.focusScore || 90}% observed focus score.`;
    
    document.getElementById("synaptiq-break-overlay").style.display = "flex";
    this.startBreakCountdown();
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  startBreakCountdown() {
    let breakSecs = this.breakMinutes * 60;
    const display = document.getElementById("breakTimerDisplay");
    
    const breakInterval = setInterval(() => {
      if (breakSecs > 0) {
        breakSecs -= 1;
        const m = Math.floor(breakSecs / 60).toString().padStart(2, '0');
        const s = (breakSecs % 60).toString().padStart(2, '0');
        display.textContent = `${m}:${s}`;
      } else {
        clearInterval(breakInterval);
        this.closeBreak();
      }
    }, 1000);
  }

  closeBreak() {
    document.getElementById("synaptiq-break-overlay").style.display = "none";
    this.containerEl.style.display = "none";
    this.state = "IDLE";
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  endSession() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.focusTracker) this.focusTracker.stop();
    this.containerEl.style.display = "none";
    this.state = "IDLE";
    localStorage.removeItem(TIMER_STORAGE_KEY);
  }

  persistState() {
    const data = {
      state: this.state,
      topicName: this.topicName,
      plannedMinutes: this.plannedMinutes,
      breakMinutes: this.breakMinutes,
      remainingSeconds: this.remainingSeconds,
      timestamp: Date.now()
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(data));
  }

  restoreSession() {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      const elapsed = Math.floor((Date.now() - data.timestamp) / 1000);
      
      if (data.state === "FOCUSING" && data.remainingSeconds - elapsed > 0) {
        this.startActivityTimer(data.topicName, data.plannedMinutes, data.breakMinutes);
        this.remainingSeconds = data.remainingSeconds - elapsed;
      }
    } catch (e) {
      console.warn("Failed to restore timer session:", e);
    }
  }
}

// Global Singleton Instance
export const globalTimerManager = new FloatingTimerManager();

export function autoStartTimerForActivity(topicName, defaultMinutes = 25) {
  globalTimerManager.startActivityTimer(topicName, defaultMinutes);
}
