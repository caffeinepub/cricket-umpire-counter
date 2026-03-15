import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, ChevronDown, ChevronUp, History } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "./backend.d";
import { useGetAllMatches, useSaveMatch } from "./hooks/useQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "setup" | "scoring" | "history";

interface BatsmanStats {
  name: string;
  runs: number;
  balls: number;
}

interface BowlerStats {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}

interface MatchState {
  teamA: string;
  teamB: string;
  totalOvers: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  batsman1: BatsmanStats;
  batsman2: BatsmanStats;
  bowler: BowlerStats;
}

interface HistoryEntry {
  type: "run" | "wicket" | "wide" | "noball" | "bye" | "legbye";
  runs: number;
  legal: boolean;
  prevState: Pick<MatchState, "runs" | "wickets" | "legalBalls"> & {
    b1runs: number;
    b1balls: number;
    b2runs: number;
    b2balls: number;
    bowlerRuns: number;
    bowlerBalls: number;
    bowlerWickets: number;
    bowlerOvers: number;
  };
}

interface LocalMatch {
  teamA: string;
  teamB: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  date: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cricket_history";
const ACTIVE_MATCH_KEY = "cricket_active_match";
const OVER_PRESETS = [5, 10, 15, 20, 25, 50];

const defaultBatsman = (name: string): BatsmanStats => ({
  name,
  runs: 0,
  balls: 0,
});
const defaultBowler = (): BowlerStats => ({
  name: "",
  overs: 0,
  balls: 0,
  runs: 0,
  wickets: 0,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function vibrate() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function getLocalHistory(): LocalMatch[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalHistory(matches: LocalMatch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
}

function formatOvers(legalBalls: number) {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

function getRunRate(runs: number, legalBalls: number) {
  if (legalBalls === 0) return "0.00";
  return ((runs / legalBalls) * 6).toFixed(2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Ball Dots Component ──────────────────────────────────────────────────────

function BallDots({ legalBalls }: { legalBalls: number }) {
  const ballsInCurrentOver = legalBalls % 6;
  return (
    <div className="flex gap-2 items-center justify-center flex-wrap mt-1">
      {["b0", "b1", "b2", "b3", "b4", "b5"].map((bk, i) => (
        <span
          key={bk}
          className="text-xl leading-none transition-all duration-200"
          style={{
            color:
              i < ballsInCurrentOver ? "#F59E0B" : "rgba(255,255,255,0.35)",
            textShadow:
              i < ballsInCurrentOver ? "0 0 8px rgba(245,158,11,0.6)" : "none",
          }}
        >
          {i < ballsInCurrentOver ? "●" : "○"}
        </span>
      ))}
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onStart: (teamA: string, teamB: string, totalOvers: number) => void;
  onHistory: () => void;
}

function SetupScreen({ onStart, onHistory }: SetupScreenProps) {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number>(20);
  const [customOvers, setCustomOvers] = useState("");

  const finalOvers =
    customOvers !== "" ? Number.parseInt(customOvers, 10) : selectedPreset;

  const handlePresetClick = (preset: number) => {
    setSelectedPreset(preset);
    setCustomOvers("");
    vibrate();
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d+$/.test(val)) {
      setCustomOvers(val);
    }
  };

  const handleStart = () => {
    if (!teamA.trim() || !teamB.trim()) {
      toast.error("Please enter both team names");
      return;
    }
    const overs = finalOvers;
    if (!overs || overs <= 0 || Number.isNaN(overs)) {
      toast.error("Please enter a valid number of overs (greater than 0)");
      return;
    }
    vibrate();
    onStart(teamA.trim(), teamB.trim(), overs);
  };

  return (
    <div
      data-ocid="match.setup.panel"
      className="flex flex-col min-h-screen bg-background"
    >
      {/* Header */}
      <header className="cricket-scoreboard px-4 py-5 shadow-scoreboard">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div>
            <h1 className="font-display text-2xl font-bold text-white tracking-wide">
              CRICKET UMPIRE
            </h1>
            <p className="text-white/60 text-sm mt-0.5">Match Setup</p>
          </div>
          <button
            type="button"
            onClick={onHistory}
            className="btn-tap text-white/70 hover:text-white p-2 rounded-xl"
            aria-label="Match History"
          >
            <History size={24} />
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-[480px] mx-auto w-full">
        <div className="bg-card rounded-2xl shadow-card p-5 flex flex-col gap-4 border border-border">
          <h2 className="font-display text-lg font-semibold text-foreground">
            New Match
          </h2>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="teamA"
              className="text-sm font-medium text-foreground/70"
            >
              Team A
            </label>
            <input
              id="teamA"
              data-ocid="match.teama.input"
              type="text"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="Enter Team A name"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cricket-green text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="teamB"
              className="text-sm font-medium text-foreground/70"
            >
              Team B
            </label>
            <input
              id="teamB"
              data-ocid="match.teamb.input"
              type="text"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="Enter Team B name"
              className="w-full px-4 py-3.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cricket-green text-base"
            />
          </div>

          {/* Total Overs */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground/70">
              Total Overs
            </span>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {OVER_PRESETS.map((preset) => {
                const isActive =
                  customOvers === "" && selectedPreset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className="btn-tap px-4 py-2 rounded-full text-sm font-semibold border shadow-sm transition-all"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, #16A34A 0%, #15803D 100%)"
                        : "#fff",
                      color: isActive ? "#fff" : "#15803D",
                      borderColor: "#16A34A",
                      boxShadow: isActive
                        ? "0 2px 10px rgba(21,128,61,0.35)"
                        : "none",
                    }}
                    aria-pressed={isActive}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="customOvers"
                className="text-xs text-muted-foreground"
              >
                Or enter custom overs:
              </label>
              <input
                id="customOvers"
                data-ocid="match.overs.select"
                type="number"
                min="1"
                value={customOvers}
                onChange={handleCustomChange}
                placeholder="e.g. 12, 15, 25"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cricket-green text-base"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Selected:{" "}
              <span className="font-semibold text-cricket-green">
                {finalOvers && !Number.isNaN(finalOvers) && finalOvers > 0
                  ? `${finalOvers} overs`
                  : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Player names */}
        <div className="bg-card rounded-2xl shadow-card p-5 flex flex-col gap-4 border border-border">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Players (Optional)
          </h2>
          <p className="text-sm text-muted-foreground -mt-2">
            You can set player names from the scoring screen.
          </p>
        </div>

        <button
          type="button"
          data-ocid="match.start.primary_button"
          onClick={handleStart}
          className="btn-tap w-full py-4 rounded-2xl text-white font-display font-bold text-lg"
          style={{
            background: "linear-gradient(135deg, #0A3D26 0%, #16A34A 100%)",
            boxShadow: "0 6px 20px rgba(10,61,38,0.45)",
          }}
        >
          🏏 Start Match
        </button>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

// ─── Scoring Screen ───────────────────────────────────────────────────────────

interface ScoringScreenProps {
  match: MatchState;
  onUpdateMatch: (updater: (m: MatchState) => MatchState) => void;
  onReset: () => void;
  onSave: () => void;
  onHistory: () => void;
  actionHistory: HistoryEntry[];
  onUndo: () => void;
  onPushHistory: (entry: HistoryEntry) => void;
}

function ScoringScreen({
  match,
  onUpdateMatch,
  onReset,
  onSave,
  onHistory,
  actionHistory,
  onUndo,
  onPushHistory,
}: ScoringScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState("");
  const [scorePop, setScorePop] = useState(false);

  const currentOvers = Math.floor(match.legalBalls / 6);
  const currentBalls = match.legalBalls % 6;
  const oversDisplay = `${currentOvers}.${currentBalls}`;
  const runRate = getRunRate(match.runs, match.legalBalls);
  const matchOver =
    match.wickets >= 10 || match.legalBalls >= match.totalOvers * 6;

  const popScore = () => {
    setScorePop(true);
    setTimeout(() => setScorePop(false), 250);
  };

  const snapshot = useCallback(
    () => ({
      runs: match.runs,
      wickets: match.wickets,
      legalBalls: match.legalBalls,
      b1runs: match.batsman1.runs,
      b1balls: match.batsman1.balls,
      b2runs: match.batsman2.runs,
      b2balls: match.batsman2.balls,
      bowlerRuns: match.bowler.runs,
      bowlerBalls: match.bowler.balls,
      bowlerWickets: match.bowler.wickets,
      bowlerOvers: match.bowler.overs,
    }),
    [match],
  );

  const handleRun = (run: number) => {
    if (matchOver) return;
    vibrate();
    const prev = snapshot();
    onPushHistory({ type: "run", runs: run, legal: true, prevState: prev });
    onUpdateMatch((m) => ({
      ...m,
      runs: m.runs + run,
      legalBalls: m.legalBalls + 1,
      batsman1: {
        ...m.batsman1,
        runs: m.batsman1.runs + run,
        balls: m.batsman1.balls + 1,
      },
      bowler: {
        ...m.bowler,
        runs: m.bowler.runs + run,
        balls: m.bowler.balls + 1,
        overs: Math.floor((m.bowler.balls + 1) / 6),
      },
    }));
    popScore();
  };

  const handleWicket = () => {
    if (matchOver || match.wickets >= 10) return;
    vibrate();
    const prev = snapshot();
    onPushHistory({ type: "wicket", runs: 0, legal: true, prevState: prev });
    onUpdateMatch((m) => ({
      ...m,
      wickets: m.wickets + 1,
      legalBalls: m.legalBalls + 1,
      bowler: {
        ...m.bowler,
        balls: m.bowler.balls + 1,
        overs: Math.floor((m.bowler.balls + 1) / 6),
        wickets: m.bowler.wickets + 1,
      },
    }));
    popScore();
  };

  const handleExtra = (
    type: "wide" | "noball" | "bye" | "legbye",
    isLegal: boolean,
  ) => {
    if (matchOver) return;
    vibrate();
    const prev = snapshot();
    onPushHistory({ type, runs: 1, legal: isLegal, prevState: prev });
    onUpdateMatch((m) => ({
      ...m,
      runs: m.runs + 1,
      legalBalls: isLegal ? m.legalBalls + 1 : m.legalBalls,
      bowler: {
        ...m.bowler,
        runs: m.bowler.runs + 1,
        balls: isLegal ? m.bowler.balls + 1 : m.bowler.balls,
        overs: isLegal ? Math.floor((m.bowler.balls + 1) / 6) : m.bowler.overs,
      },
    }));
    popScore();
  };

  const startEdit = (field: string, currentVal: string) => {
    setEditingField(field);
    setTempVal(currentVal);
  };

  const commitEdit = (field: string) => {
    if (field === "b1name")
      onUpdateMatch((m) => ({
        ...m,
        batsman1: { ...m.batsman1, name: tempVal },
      }));
    else if (field === "b2name")
      onUpdateMatch((m) => ({
        ...m,
        batsman2: { ...m.batsman2, name: tempVal },
      }));
    else if (field === "bowlername")
      onUpdateMatch((m) => ({ ...m, bowler: { ...m.bowler, name: tempVal } }));
    setEditingField(null);
    setTempVal("");
  };

  const strikeRate = (runs: number, balls: number) =>
    balls === 0 ? "0.0" : ((runs / balls) * 100).toFixed(1);

  return (
    <div
      data-ocid="scoring.panel"
      className="flex flex-col min-h-screen bg-background"
    >
      {/* Header */}
      <header className="cricket-scoreboard px-4 py-3 shadow-scoreboard">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <h1 className="font-display text-xl font-bold text-white tracking-widest uppercase">
            Cricket Umpire
          </h1>
          <div className="flex items-center gap-3">
            <span
              className="font-display text-2xl font-bold"
              style={{ color: "#F59E0B" }}
            >
              {match.runs}
            </span>
            <button
              type="button"
              onClick={onHistory}
              className="btn-tap text-white/60 hover:text-white p-1.5"
              aria-label="History"
            >
              <History size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-[480px] mx-auto px-3 flex flex-col gap-3 pt-3">
          {/* Scoreboard Card */}
          <div className="cricket-scoreboard rounded-2xl shadow-scoreboard p-4 text-white">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white/60 text-xs font-medium tracking-wider uppercase">
                  {match.teamA}
                </p>
                <div
                  className={`font-display font-bold leading-none mt-1 transition-transform ${
                    scorePop ? "animate-score-pop" : ""
                  }`}
                  style={{ fontSize: "3rem" }}
                >
                  {match.runs}/{match.wickets}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs uppercase tracking-wider">
                  Overs
                </p>
                <p className="font-display text-2xl font-bold mt-1">
                  {oversDisplay}
                </p>
                <p className="text-white/50 text-xs mt-0.5">RR: {runRate}</p>
              </div>
            </div>
            <BallDots legalBalls={match.legalBalls} />
            {matchOver && (
              <div className="mt-3 text-center">
                <span className="bg-white/20 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  {match.wickets >= 10 ? "All Out" : "Innings Complete"}
                </span>
              </div>
            )}
          </div>

          {/* Run Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                {
                  label: "0",
                  run: 0,
                  ocid: "scoring.run0.button",
                  cls: "btn-run",
                },
                {
                  label: "1",
                  run: 1,
                  ocid: "scoring.run1.button",
                  cls: "btn-run",
                },
                {
                  label: "2",
                  run: 2,
                  ocid: "scoring.run2.button",
                  cls: "btn-run",
                },
                {
                  label: "3",
                  run: 3,
                  ocid: "scoring.run3.button",
                  cls: "btn-run",
                },
                {
                  label: "4",
                  run: 4,
                  ocid: "scoring.run4.button",
                  cls: "btn-boundary",
                },
                {
                  label: "6",
                  run: 6,
                  ocid: "scoring.run6.button",
                  cls: "btn-boundary",
                },
              ] as const
            ).map(({ label, run, ocid, cls }) => (
              <button
                type="button"
                key={label}
                data-ocid={ocid}
                onClick={() => handleRun(run)}
                disabled={matchOver}
                className={`btn-tap ${cls} rounded-xl font-display font-bold text-2xl disabled:opacity-40`}
                style={{ minHeight: "64px" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Wicket Button */}
          <button
            type="button"
            data-ocid="scoring.wicket.button"
            onClick={handleWicket}
            disabled={matchOver || match.wickets >= 10}
            className="btn-tap btn-wicket w-full rounded-xl font-display font-bold text-xl disabled:opacity-40 animate-wicket-pulse"
            style={{ minHeight: "60px" }}
          >
            🏏 WICKET
          </button>

          {/* Extras Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-ocid="scoring.wide.button"
              onClick={() => handleExtra("wide", false)}
              disabled={matchOver}
              className="btn-tap btn-wide rounded-xl font-display font-semibold text-lg disabled:opacity-40"
              style={{ minHeight: "58px" }}
            >
              Wide +1
            </button>
            <button
              type="button"
              data-ocid="scoring.noball.button"
              onClick={() => handleExtra("noball", false)}
              disabled={matchOver}
              className="btn-tap btn-noball rounded-xl font-display font-semibold text-lg disabled:opacity-40"
              style={{ minHeight: "58px" }}
            >
              No Ball +1
            </button>
            <button
              type="button"
              data-ocid="scoring.bye.button"
              onClick={() => handleExtra("bye", true)}
              disabled={matchOver}
              className="btn-tap btn-bye rounded-xl font-display font-semibold text-lg disabled:opacity-40"
              style={{ minHeight: "58px" }}
            >
              Bye +1
            </button>
            <button
              type="button"
              data-ocid="scoring.legbye.button"
              onClick={() => handleExtra("legbye", true)}
              disabled={matchOver}
              className="btn-tap btn-legbye rounded-xl font-display font-semibold text-lg disabled:opacity-40"
              style={{ minHeight: "58px" }}
            >
              Leg Bye +1
            </button>
          </div>

          {/* Player Stats Toggle */}
          <button
            type="button"
            data-ocid="scoring.stats.toggle"
            onClick={() => setShowStats((v) => !v)}
            className="btn-tap btn-stats-toggle w-full flex items-center justify-between bg-card rounded-xl px-4 py-3 shadow-card text-foreground font-medium border border-border"
          >
            <span>Player Stats</span>
            {showStats ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Collapsible Player Stats */}
          {showStats && (
            <div className="bg-card rounded-xl shadow-card p-4 flex flex-col gap-4 border border-border">
              {/* Batsmen */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Batsmen
                </p>
                {(["batsman1", "batsman2"] as const).map((key, idx) => {
                  const b = match[key];
                  const nameField = idx === 0 ? "b1name" : "b2name";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1">
                        {editingField === nameField ? (
                          <input
                            value={tempVal}
                            onChange={(e) => setTempVal(e.target.value)}
                            onBlur={() => commitEdit(nameField)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && commitEdit(nameField)
                            }
                            className="text-sm font-medium border-b border-cricket-green outline-none bg-transparent w-32"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(nameField, b.name)}
                            className="text-sm font-medium text-left"
                          >
                            {b.name || `Batsman ${idx + 1}`}{" "}
                            <span className="text-xs text-muted-foreground">
                              ✎
                            </span>
                          </button>
                        )}
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className="font-bold text-cricket-green">
                          {b.runs}
                        </span>
                        <span className="text-muted-foreground">
                          ({b.balls})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          SR {strikeRate(b.runs, b.balls)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bowler */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Bowler
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingField === "bowlername" ? (
                      <input
                        value={tempVal}
                        onChange={(e) => setTempVal(e.target.value)}
                        onBlur={() => commitEdit("bowlername")}
                        onKeyDown={(e) =>
                          e.key === "Enter" && commitEdit("bowlername")
                        }
                        className="text-sm font-medium border-b border-cricket-green outline-none bg-transparent w-32"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          startEdit("bowlername", match.bowler.name)
                        }
                        className="text-sm font-medium text-left"
                      >
                        {match.bowler.name || "Bowler"}{" "}
                        <span className="text-xs text-muted-foreground">✎</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {formatOvers(match.bowler.balls)}
                    </span>
                    <span className="font-bold text-cricket-red">
                      {match.bowler.runs}
                    </span>
                    <span className="text-muted-foreground">
                      {match.bowler.wickets}W
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Undo + Reset */}
          <div className="grid grid-cols-2 gap-2 pb-2">
            <button
              type="button"
              data-ocid="scoring.undo.button"
              onClick={() => {
                vibrate();
                onUndo();
              }}
              disabled={actionHistory.length === 0}
              className="btn-tap btn-undo rounded-xl font-display font-semibold text-lg disabled:opacity-40"
              style={{ minHeight: "56px" }}
            >
              ↩ Undo
            </button>
            <button
              type="button"
              data-ocid="scoring.reset.button"
              onClick={() => {
                vibrate();
                onReset();
              }}
              className="btn-tap btn-reset rounded-xl font-display font-semibold text-lg"
              style={{ minHeight: "56px" }}
            >
              ⟳ Reset
            </button>
          </div>

          {matchOver && (
            <button
              type="button"
              onClick={() => {
                vibrate();
                onSave();
              }}
              className="btn-tap w-full rounded-xl font-display font-bold text-lg text-white"
              style={{
                background: "linear-gradient(135deg, #0A3D26 0%, #16A34A 100%)",
                boxShadow: "0 6px 20px rgba(10,61,38,0.45)",
                minHeight: "56px",
              }}
            >
              💾 Save Match
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── History Screen ───────────────────────────────────────────────────────────

interface HistoryScreenProps {
  onBack: () => void;
  backendMatches: Match[];
  localMatches: LocalMatch[];
}

function HistoryScreen({
  onBack,
  backendMatches,
  localMatches,
}: HistoryScreenProps) {
  const allMatches: LocalMatch[] = [
    ...backendMatches.map((m) => ({
      teamA: m.team1.name,
      teamB: m.team2.name,
      runs: Number(m.team1.score),
      wickets: 0,
      overs: Number(m.overs),
      balls: Number(m.balls),
      date: new Date(Number(m.date) / 1_000_000).toISOString(),
    })),
    ...localMatches,
  ];

  return (
    <div
      data-ocid="history.panel"
      className="flex flex-col min-h-screen bg-background"
    >
      <header className="cricket-scoreboard px-4 py-4 shadow-scoreboard">
        <div className="flex items-center gap-3 max-w-[480px] mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="btn-tap text-white/70 hover:text-white p-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-xl font-bold text-white tracking-wide">
            Match History
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[480px] mx-auto px-3 py-4 flex flex-col gap-3">
          {allMatches.length === 0 ? (
            <div
              data-ocid="history.empty_state"
              className="text-center py-16 flex flex-col items-center gap-3"
            >
              <span className="text-5xl">🏏</span>
              <p className="text-muted-foreground font-medium">
                No matches saved yet
              </p>
              <p className="text-sm text-muted-foreground">
                Complete a match to see it here
              </p>
            </div>
          ) : (
            allMatches.map((m, i) => (
              <div
                key={m.date + m.teamA}
                data-ocid={
                  `history.item.${i + 1}` as `history.item.${1 | 2 | 3}`
                }
                className="bg-card rounded-2xl shadow-card p-4 border border-border"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-semibold text-foreground">
                      {m.teamA}
                    </p>
                    <p className="text-muted-foreground text-sm">{m.teamB}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-display font-bold text-xl"
                      style={{ color: "#16A34A" }}
                    >
                      {m.runs}/{m.wickets}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatOvers(m.overs * 6 + m.balls)} ov
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(m.date)}
                </p>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

const defaultMatch = (
  teamA: string,
  teamB: string,
  totalOvers: number,
): MatchState => ({
  teamA,
  teamB,
  totalOvers,
  runs: 0,
  wickets: 0,
  legalBalls: 0,
  batsman1: defaultBatsman(""),
  batsman2: defaultBatsman(""),
  bowler: defaultBowler(),
});

function loadActiveMatch(): {
  match: MatchState;
  history: HistoryEntry[];
} | null {
  try {
    const data = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveActiveMatch(match: MatchState, history: HistoryEntry[]) {
  localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify({ match, history }));
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [match, setMatch] = useState<MatchState | null>(null);
  const [actionHistory, setActionHistory] = useState<HistoryEntry[]>([]);
  const [localMatches, setLocalMatches] = useState<LocalMatch[]>(
    getLocalHistory(),
  );

  const { data: backendMatches = [] } = useGetAllMatches();
  const saveMatch = useSaveMatch();

  useEffect(() => {
    const saved = loadActiveMatch();
    if (saved) {
      setMatch(saved.match);
      setActionHistory(saved.history);
      setScreen("scoring");
    }
  }, []);

  useEffect(() => {
    if (match) {
      saveActiveMatch(match, actionHistory);
    }
  }, [match, actionHistory]);

  const handleStart = (teamA: string, teamB: string, totalOvers: number) => {
    const m = defaultMatch(teamA, teamB, totalOvers);
    setMatch(m);
    setActionHistory([]);
    setScreen("scoring");
  };

  const handleUpdateMatch = (updater: (m: MatchState) => MatchState) => {
    setMatch((prev) => (prev ? updater(prev) : prev));
  };

  const handleUndo = () => {
    if (actionHistory.length === 0 || !match) return;
    const last = actionHistory[actionHistory.length - 1];
    const p = last.prevState;
    setMatch((m) =>
      m
        ? {
            ...m,
            runs: p.runs,
            wickets: p.wickets,
            legalBalls: p.legalBalls,
            batsman1: { ...m.batsman1, runs: p.b1runs, balls: p.b1balls },
            batsman2: { ...m.batsman2, runs: p.b2runs, balls: p.b2balls },
            bowler: {
              ...m.bowler,
              runs: p.bowlerRuns,
              balls: p.bowlerBalls,
              wickets: p.bowlerWickets,
              overs: p.bowlerOvers,
            },
          }
        : m,
    );
    setActionHistory((h) => h.slice(0, -1));
  };

  const handleReset = () => {
    if (!match) return;
    const fresh = defaultMatch(match.teamA, match.teamB, match.totalOvers);
    setMatch(fresh);
    setActionHistory([]);
    localStorage.removeItem(ACTIVE_MATCH_KEY);
    toast.success("Match reset");
  };

  const handleSave = () => {
    if (!match) return;
    const overs = Math.floor(match.legalBalls / 6);
    const balls = match.legalBalls % 6;
    const entry: LocalMatch = {
      teamA: match.teamA,
      teamB: match.teamB,
      runs: match.runs,
      wickets: match.wickets,
      overs,
      balls,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...localMatches];
    setLocalMatches(updated);
    saveLocalHistory(updated);

    saveMatch.mutate({
      team1Name: match.teamA,
      team1Score: match.runs,
      team2Name: match.teamB,
      team2Score: 0,
      overs,
      balls,
    });

    localStorage.removeItem(ACTIVE_MATCH_KEY);
    toast.success("Match saved!");
    setScreen("setup");
    setMatch(null);
    setActionHistory([]);
  };

  return (
    <>
      <Toaster position="top-center" />
      {screen === "setup" && (
        <SetupScreen
          onStart={handleStart}
          onHistory={() => setScreen("history")}
        />
      )}
      {screen === "scoring" && match && (
        <ScoringScreen
          match={match}
          onUpdateMatch={handleUpdateMatch}
          onReset={handleReset}
          onSave={handleSave}
          onHistory={() => setScreen("history")}
          actionHistory={actionHistory}
          onUndo={handleUndo}
          onPushHistory={(e) => setActionHistory((h) => [...h, e])}
        />
      )}
      {screen === "history" && (
        <HistoryScreen
          onBack={() => setScreen(match ? "scoring" : "setup")}
          backendMatches={backendMatches}
          localMatches={localMatches}
        />
      )}
    </>
  );
}
