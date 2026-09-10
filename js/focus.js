// js/focus.js — Focus Mode, Focus Score & Distraction Intelligence for SYNAPTIQAI

import { dbPut, dbGetByIndex } from "./db.js";

export class FocusTracker {
  constructor(plannedMinutes = 45) {
    this.plannedSeconds = plannedMinutes * 60;
    this.elapsedSeconds = 0;
    this.activeSeconds = 0;
    this.interruptionCount = 0;
    this.inactiveSeconds = 0;
    this.longestFocusSeconds = 0;
    this.currentStreakSeconds = 0;
    this.isRunning = false;
    this.intervalId = null;
    this.listeners = [];

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    this.intervalId = setInterval(() => {
      if (!this.isRunning) return;
      this.elapsedSeconds += 1;

      if (document.hidden) {
        this.inactiveSeconds += 1;
        this.currentStreakSeconds = 0;
      } else {
        this.activeSeconds += 1;
        this.currentStreakSeconds += 1;
        if (this.currentStreakSeconds > this.longestFocusSeconds) {
          this.longestFocusSeconds = this.currentStreakSeconds;
        }
      }

      this.notify();
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.interruptionCount += 1;
    this.currentStreakSeconds = 0;
    this.notify();
  }

  resume() {
    if (this.isRunning) return;
    this.start();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.interruptionCount += 1;
      this.currentStreakSeconds = 0;
      this.notify();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    return this.calculateStats();
  }

  calculateStats() {
    const plannedMins = Math.round(this.plannedSeconds / 60);
    const activeMins = Math.round(this.activeSeconds / 60);
    const inactiveMins = Math.round(this.inactiveSeconds / 60);
    const longestFocusMins = Math.round(this.longestFocusSeconds / 60);

    // Focus Score calculation (0 - 100%)
    const durationRatio = Math.min(1, this.activeSeconds / (this.plannedSeconds || 1));
    const penaltyPerInterruption = 0.05;
    const interruptionPenalty = Math.min(0.4, this.interruptionCount * penaltyPerInterruption);
    const focusScore = Math.max(0, Math.min(100, Math.round((durationRatio - interruptionPenalty) * 100)));

    return {
      plannedMinutes: plannedMins,
      observedFocusMinutes: activeMins,
      observedInterruptionMinutes: inactiveMins,
      interruptionCount: this.interruptionCount,
      longestFocusMinutes: longestFocusMins,
      focusScore,
      completed: this.elapsedSeconds >= this.plannedSeconds
    };
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    const stats = this.calculateStats();
    this.listeners.forEach(fn => fn(stats));
  }
}

export async function saveFocusSession(userId, sessionStats) {
  const record = {
    id: "foc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    userId,
    ...sessionStats,
    createdAt: new Date().toISOString()
  };
  await dbPut("focusSessions", record);
  return record;
}

export async function getDistractionIntelligence(userId) {
  try {
    const list = await dbGetByIndex("focusSessions", "userId", userId);
    if (list.length === 0) {
      return {
        recommendedBlockMinutes: 40,
        recommendedBreakMinutes: 10,
        insight: "Recommended start: 40-minute focus blocks with 10-minute breaks."
      };
    }

    const avgLongestFocus = Math.round(
      list.reduce((acc, s) => acc + (s.longestFocusMinutes || 25), 0) / list.length
    );

    if (avgLongestFocus < 30) {
      return {
        recommendedBlockMinutes: 25,
        recommendedBreakMinutes: 5,
        insight: "Your focus analytics indicate attention drops after 25 minutes. 25m focus + 5m break recommended."
      };
    } else if (avgLongestFocus < 45) {
      return {
        recommendedBlockMinutes: 35,
        recommendedBreakMinutes: 8,
        insight: "Optimal focus block for your profile: 35-minute focus + 8-minute break."
      };
    } else {
      return {
        recommendedBlockMinutes: 50,
        recommendedBreakMinutes: 10,
        insight: "High focus endurance detected! 50-minute deep work blocks recommended."
      };
    }
  } catch {
    return {
      recommendedBlockMinutes: 40,
      recommendedBreakMinutes: 10,
      insight: "Standard Pomodoro balance: 40m focus + 10m break."
    };
  }
}
