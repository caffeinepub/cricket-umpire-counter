import { Toaster } from "@/components/ui/sonner";
import { ArrowLeft, ChevronDown, ChevronUp, History } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Match } from "./backend.d";
import { useGetAllMatches, useSaveMatch } from "./hooks/useQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = "setup" | "scoring" | "innings-break" | "result" | "history";

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

interface Innings1Result {
  runs: number;
  wickets: number;
  legalBalls: number;
  totalOvers: number;
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
  team2Runs?: number;
  team2Wickets?: number;
  result?: string;
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

function getRequiredRunRate(
  target: number,
  runs: number,
  legalBalls: number,
  totalOvers: number,
) {
  const remainingRuns = target - runs;
  const remainingBalls = totalOvers * 6 - legalBalls;
  if (remainingBalls <= 0) return "0.00";
  if (remainingRuns <= 0) return "0.00";
  return ((remainingRuns / remainingBalls) * 6).toFixed(2);
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
              i < ballsInCurrentOver ? "#F59E0B" : "rgba(255,255,255,0.28)",
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
      className="panel-bg flex flex-col min-h-screen"
    >
      {/* Header */}
      <header className="cricket-scoreboard px-4 py-5">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div>
            <h1 className="scoreboard-title font-display text-2xl font-bold text-white tracking-wide">
              🏏 CRICKET UMPIRE
            </h1>
            <p className="text-white/60 text-sm mt-0.5">Match Setup</p>
          </div>
          <button
            type="button"
            onClick={onHistory}
            data-ocid="setup.history.button"
            className="btn-tap text-white/60 hover:text-white p-2 rounded-xl"
            aria-label="Match History"
          >
            <History size={24} />
          </button>
        </div>
      </header>

      {/* Form */}
      <main className="flex-1 flex flex-col gap-5 px-4 py-6 max-w-[480px] mx-auto w-full">
        <div className="cricket-card rounded-2xl p-5 flex flex-col gap-4">
          <h2
            className="font-display text-lg font-semibold"
            style={{ color: "#f59e0b" }}
          >
            ✦ New Match
          </h2>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="teamA"
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.75)" }}
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
              className="w-full px-4 py-3.5 rounded-xl text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="teamB"
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.75)" }}
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
              className="w-full px-4 py-3.5 rounded-xl text-base"
            />
          </div>

          {/* Total Overs */}
          <div className="flex flex-col gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
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
                    className="btn-tap px-4 py-2 rounded-full text-sm font-semibold transition-all"
                    style={{
                      background: isActive
                        ? "#22c55e"
                        : "rgba(255,255,255,0.08)",
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.65)",
                      border: isActive
                        ? "1.5px solid #22c55e"
                        : "1.5px solid rgba(255,255,255,0.18)",
                      boxShadow: isActive
                        ? "0 3px 12px rgba(34,197,94,0.5)"
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
                className="text-xs"
                style={{ color: "rgba(255,255,255,0.45)" }}
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
                className="w-full px-4 py-3 rounded-xl text-base"
              />
            </div>

            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Selected:{" "}
              <span className="font-semibold" style={{ color: "#f59e0b" }}>
                {finalOvers && !Number.isNaN(finalOvers) && finalOvers > 0
                  ? `${finalOvers} overs`
                  : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Player names note */}
        <div className="cricket-card rounded-2xl p-5 flex flex-col gap-2">
          <h2
            className="font-display text-lg font-semibold"
            style={{ color: "#f59e0b" }}
          >
            ✦ Players (Optional)
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            You can set player names from the scoring screen.
          </p>
        </div>

        <button
          type="button"
          data-ocid="match.start.primary_button"
          onClick={handleStart}
          className="btn-tap w-full py-4 rounded-2xl text-white font-display font-bold text-lg"
          style={{
            background: "linear-gradient(135deg, #0f5132 0%, #22c55e 100%)",
            boxShadow: "0 6px 24px rgba(34,197,94,0.45)",
          }}
        >
          🏏 Start Match
        </button>
      </main>

      <footer
        className="text-center py-4 text-xs"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: "#22c55e" }}
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
  chasingTarget?: number;
  onInningsEnd?: () => void;
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
  chasingTarget,
  onInningsEnd,
}: ScoringScreenProps) {
  const [showStats, setShowStats] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempVal, setTempVal] = useState("");
  const [scorePop, setScorePop] = useState(false);

  const currentOvers = Math.floor(match.legalBalls / 6);
  const currentBalls = match.legalBalls % 6;
  const oversDisplay = `${currentOvers}.${currentBalls}`;
  const runRate = getRunRate(match.runs, match.legalBalls);

  const isChasing = chasingTarget !== undefined;
  const targetReached = isChasing && match.runs >= chasingTarget!;
  const matchOver =
    match.wickets >= 10 ||
    match.legalBalls >= match.totalOvers * 6 ||
    targetReached;

  const runsNeeded = isChasing ? Math.max(0, chasingTarget! - match.runs) : 0;
  const rrr = isChasing
    ? getRequiredRunRate(
        chasingTarget!,
        match.runs,
        match.legalBalls,
        match.totalOvers,
      )
    : "";

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
      className="panel-bg flex flex-col min-h-screen"
    >
      {/* Header */}
      <header className="cricket-scoreboard px-4 py-3">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div>
            <h1 className="scoreboard-title font-display text-xl font-bold text-white uppercase">
              {isChasing ? match.teamA : "Cricket Umpire"}
            </h1>
            {isChasing && (
              <p className="text-white/60 text-xs mt-0.5">
                {match.teamB} batting
              </p>
            )}
          </div>
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
              data-ocid="scoring.history.button"
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
          {/* Target info bar — only when chasing */}
          {isChasing && (
            <div className="target-info-bar">
              <div className="text-center">
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  Target
                </p>
                <p
                  className="font-display font-bold text-xl"
                  style={{ color: "#F59E0B" }}
                >
                  {chasingTarget}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  Need
                </p>
                <p className="font-display font-bold text-xl text-white">
                  {runsNeeded}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-xs uppercase tracking-wider">
                  RRR
                </p>
                <p
                  className="font-display font-bold text-xl"
                  style={{ color: "#F59E0B" }}
                >
                  {rrr}
                </p>
              </div>
            </div>
          )}

          {/* Scoreboard Card */}
          <div className="cricket-scoreboard rounded-2xl p-4 text-white">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {isChasing ? match.teamB : match.teamA}
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
                <p
                  className="font-display text-2xl font-bold mt-1"
                  style={{ color: "#F59E0B" }}
                >
                  {oversDisplay}
                </p>
                <p className="text-white/50 text-xs mt-0.5">RR: {runRate}</p>
              </div>
            </div>
            <BallDots legalBalls={match.legalBalls} />
            {matchOver && (
              <div className="mt-3 text-center">
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                  }}
                >
                  {targetReached
                    ? "🏆 Target Reached!"
                    : match.wickets >= 10
                      ? "All Out"
                      : "Innings Complete"}
                </span>
              </div>
            )}
          </div>

          {/* Section label: RUNS */}
          <p
            className="text-xs font-bold tracking-widest uppercase px-1"
            style={{ color: "#f59e0b" }}
          >
            RUNS
          </p>

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
            className="btn-tap btn-wicket w-full rounded-xl font-display font-bold text-xl disabled:opacity-40"
            style={{ minHeight: "60px" }}
          >
            🏏 WICKET
          </button>

          {/* Section label: EXTRAS */}
          <p
            className="text-xs font-bold tracking-widest uppercase px-1"
            style={{ color: "#f59e0b" }}
          >
            EXTRAS (+1 RUN)
          </p>

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
            className="btn-tap btn-stats-toggle w-full flex items-center justify-between cricket-card rounded-xl px-4 py-3"
          >
            <span style={{ color: "#22c55e", fontWeight: 600 }}>
              Player Stats
            </span>
            {showStats ? (
              <ChevronUp size={18} style={{ color: "#22c55e" }} />
            ) : (
              <ChevronDown size={18} style={{ color: "#22c55e" }} />
            )}
          </button>

          {/* Collapsible Player Stats */}
          {showStats && (
            <div className="cricket-card rounded-xl p-4 flex flex-col gap-4">
              {/* Batsmen */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#f59e0b" }}
                >
                  Batsmen
                </p>
                {(["batsman1", "batsman2"] as const).map((key, idx) => {
                  const b = match[key];
                  const field = key === "batsman1" ? "b1name" : "b2name";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2"
                      style={{
                        borderBottom:
                          idx === 0
                            ? "1px solid rgba(255,255,255,0.1)"
                            : "none",
                      }}
                    >
                      <div className="flex-1">
                        {editingField === field ? (
                          <input
                            type="text"
                            value={tempVal}
                            onChange={(e) => setTempVal(e.target.value)}
                            onBlur={() => commitEdit(field)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && commitEdit(field)
                            }
                            className="w-full px-2 py-1 rounded-lg text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(field, b.name || `Batsman ${idx + 1}`)
                            }
                            className="text-left text-sm font-medium"
                            style={{ color: "rgba(255,255,255,0.85)" }}
                          >
                            {b.name || `Batsman ${idx + 1}`}{" "}
                            <span
                              style={{
                                color: "rgba(255,255,255,0.4)",
                                fontSize: "0.7rem",
                              }}
                            >
                              ✎
                            </span>
                          </button>
                        )}
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            Runs
                          </p>
                          <p className="font-bold" style={{ color: "#22c55e" }}>
                            {b.runs}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            Balls
                          </p>
                          <p className="font-bold text-white">{b.balls}</p>
                        </div>
                        <div>
                          <p
                            className="text-xs"
                            style={{ color: "rgba(255,255,255,0.5)" }}
                          >
                            SR
                          </p>
                          <p className="font-bold" style={{ color: "#f59e0b" }}>
                            {strikeRate(b.runs, b.balls)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bowler */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#f59e0b" }}
                >
                  Bowler
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {editingField === "bowlername" ? (
                      <input
                        type="text"
                        value={tempVal}
                        onChange={(e) => setTempVal(e.target.value)}
                        onBlur={() => commitEdit("bowlername")}
                        onKeyDown={(e) =>
                          e.key === "Enter" && commitEdit("bowlername")
                        }
                        className="w-full px-2 py-1 rounded-lg text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          startEdit("bowlername", match.bowler.name || "Bowler")
                        }
                        className="text-left text-sm font-medium"
                        style={{ color: "rgba(255,255,255,0.85)" }}
                      >
                        {match.bowler.name || "Bowler"}{" "}
                        <span
                          style={{
                            color: "rgba(255,255,255,0.4)",
                            fontSize: "0.7rem",
                          }}
                        >
                          ✎
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Ov
                      </p>
                      <p className="font-bold text-white">
                        {match.bowler.overs}.{match.bowler.balls % 6}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Runs
                      </p>
                      <p className="font-bold" style={{ color: "#22c55e" }}>
                        {match.bowler.runs}
                      </p>
                    </div>
                    <div>
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.5)" }}
                      >
                        Wkts
                      </p>
                      <p className="font-bold" style={{ color: "#dc2626" }}>
                        {match.bowler.wickets}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Undo / Reset */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-ocid="scoring.undo.button"
              onClick={() => {
                vibrate();
                onUndo();
              }}
              disabled={actionHistory.length === 0}
              className="btn-tap btn-undo rounded-xl font-display font-semibold text-base disabled:opacity-40"
              style={{ minHeight: "52px" }}
            >
              ↩ Undo
            </button>
            <button
              type="button"
              data-ocid="scoring.reset.delete_button"
              onClick={() => {
                vibrate();
                onReset();
              }}
              className="btn-tap btn-reset rounded-xl font-display font-semibold text-base"
              style={{ minHeight: "52px" }}
            >
              ↺ Reset
            </button>
          </div>

          {/* End innings CTA */}
          {!matchOver && (
            <button
              type="button"
              data-ocid="scoring.end-innings.secondary_button"
              onClick={() => {
                vibrate();
                onInningsEnd?.();
              }}
              className="btn-tap w-full rounded-xl font-display font-semibold text-base"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.7)",
                minHeight: "48px",
              }}
            >
              📋 End Innings Manually
            </button>
          )}

          {/* CTA: See result after match over (chasing) */}
          {matchOver && isChasing && (
            <button
              type="button"
              data-ocid="scoring.result.primary_button"
              onClick={() => {
                vibrate();
                onInningsEnd?.();
              }}
              className="btn-tap w-full py-4 rounded-2xl font-display font-bold text-xl text-white"
              style={{
                background: "linear-gradient(135deg, #0f5132 0%, #22c55e 100%)",
                boxShadow: "0 6px 24px rgba(34,197,94,0.45)",
              }}
            >
              🏆 See Match Result
            </button>
          )}

          {/* Save match (solo innings — no 2nd innings) */}
          {matchOver && !isChasing && (
            <button
              type="button"
              data-ocid="scoring.save.secondary_button"
              onClick={() => {
                vibrate();
                onSave();
              }}
              className="btn-tap w-full rounded-xl font-display font-semibold text-base"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.7)",
                minHeight: "48px",
              }}
            >
              💾 Save & Exit (1st Innings Only)
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Innings Break Screen ─────────────────────────────────────────────────────

interface InningsBreakScreenProps {
  teamA: string;
  teamB: string;
  innings1Runs: number;
  innings1Wickets: number;
  innings1Overs: string;
  totalOvers: number;
  onStart2ndInnings: () => void;
  onSaveAndExit: () => void;
}

function InningsBreakScreen({
  teamA,
  teamB,
  innings1Runs,
  innings1Wickets,
  innings1Overs,
  totalOvers,
  onStart2ndInnings,
  onSaveAndExit,
}: InningsBreakScreenProps) {
  const target = innings1Runs + 1;

  return (
    <div
      data-ocid="innings-break.panel"
      className="panel-bg flex flex-col min-h-screen items-center justify-center px-4 py-8"
    >
      <div className="max-w-[480px] w-full flex flex-col gap-5">
        {/* Innings summary */}
        <div className="innings-break-card text-center">
          <div className="text-white/70 text-sm uppercase tracking-widest font-semibold mb-2">
            Innings Complete
          </div>
          <div className="font-display font-bold text-3xl text-white mb-1">
            {teamA}
          </div>
          <div
            className="font-display font-bold"
            style={{ fontSize: "3.5rem", color: "#F59E0B" }}
          >
            {innings1Runs}/{innings1Wickets}
          </div>
          <div className="text-white/70 text-sm mt-1">
            {innings1Overs} overs
          </div>

          <div
            className="mt-5 pt-4 border-t"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            <p className="text-white/80 text-base">
              <span className="font-bold text-white">{teamB}</span> needs{" "}
              <span
                className="font-display font-bold text-xl"
                style={{ color: "#F59E0B" }}
              >
                {target} runs
              </span>{" "}
              in{" "}
              <span className="font-bold text-white">{totalOvers} overs</span>{" "}
              to win
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          data-ocid="innings-break.start2nd.primary_button"
          onClick={onStart2ndInnings}
          className="btn-tap w-full py-4 rounded-2xl font-display font-bold text-xl text-white"
          style={{
            background: "linear-gradient(135deg, #0f5132 0%, #22c55e 100%)",
            boxShadow: "0 6px 24px rgba(34,197,94,0.45)",
          }}
        >
          🏏 Start 2nd Innings
        </button>

        <button
          type="button"
          data-ocid="innings-break.save.secondary_button"
          onClick={onSaveAndExit}
          className="btn-tap w-full py-3 rounded-2xl font-semibold text-base"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          💾 Save 1st Innings & Exit
        </button>
      </div>
    </div>
  );
}

// ─── Match Result Screen ──────────────────────────────────────────────────────

interface MatchResultScreenProps {
  teamA: string;
  teamB: string;
  innings1: Innings1Result;
  innings2Runs: number;
  innings2Wickets: number;
  innings2Balls: number;
  onSave: () => void;
  onNewMatch: () => void;
}

function MatchResultScreen({
  teamA,
  teamB,
  innings1,
  innings2Runs,
  innings2Wickets,
  innings2Balls,
  onSave,
  onNewMatch,
}: MatchResultScreenProps) {
  const target = innings1.runs + 1;
  const won2nd = innings2Runs >= target;
  const won1st = !won2nd;
  const tied = innings2Runs === innings1.runs && innings2Wickets >= 10;

  let resultText = "";
  let resultEmoji = "🏆";
  if (tied) {
    resultText = "Match Tied!";
    resultEmoji = "🤝";
  } else if (won2nd) {
    const wicketsLeft = 10 - innings2Wickets;
    resultText = `${teamB} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? "s" : ""}`;
  } else {
    const runsMargin = innings1.runs - innings2Runs;
    resultText = `${teamA} won by ${runsMargin} run${runsMargin !== 1 ? "s" : ""}`;
    resultEmoji = won1st ? "🏆" : "🏆";
  }

  return (
    <div
      data-ocid="result.panel"
      className="panel-bg flex flex-col min-h-screen items-center justify-center px-4 py-8"
    >
      <div className="max-w-[480px] w-full flex flex-col gap-5">
        {/* Result banner */}
        <div className="result-card text-center">
          <div className="text-5xl mb-3">{resultEmoji}</div>
          <div className="font-display font-bold text-2xl text-white mb-1">
            {resultText}
          </div>
          <p className="text-white/70 text-sm">Full Match Result</p>
        </div>

        {/* Scorecard summary */}
        <div className="cricket-card rounded-2xl p-4 flex flex-col gap-4">
          {/* 1st innings */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#f59e0b" }}
            >
              1st Innings
            </p>
            <div className="flex items-center justify-between">
              <span
                className="font-display font-semibold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {teamA}
              </span>
              <span
                className="font-display font-bold text-xl"
                style={{ color: "#22c55e" }}
              >
                {innings1.runs}/{innings1.wickets}
              </span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {formatOvers(innings1.legalBalls)} ov · RR{" "}
              {getRunRate(innings1.runs, innings1.legalBalls)}
            </p>
          </div>

          <div style={{ height: "1px", background: "rgba(255,255,255,0.1)" }} />

          {/* 2nd innings */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#f59e0b" }}
            >
              2nd Innings
            </p>
            <div className="flex items-center justify-between">
              <span
                className="font-display font-semibold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {teamB}
              </span>
              <span
                className="font-display font-bold text-xl"
                style={{ color: "#22c55e" }}
              >
                {innings2Runs}/{innings2Wickets}
              </span>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              {formatOvers(innings2Balls)} ov · Target was {target} · RR{" "}
              {getRunRate(innings2Runs, innings2Balls)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          type="button"
          data-ocid="result.save.primary_button"
          onClick={onSave}
          className="btn-tap w-full py-4 rounded-2xl font-display font-bold text-xl text-white"
          style={{
            background: "linear-gradient(135deg, #0f5132 0%, #22c55e 100%)",
            boxShadow: "0 6px 24px rgba(34,197,94,0.45)",
          }}
        >
          💾 Save Match
        </button>

        <button
          type="button"
          data-ocid="result.newmatch.secondary_button"
          onClick={onNewMatch}
          className="btn-tap w-full py-3 rounded-2xl font-semibold text-base"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          🏏 New Match
        </button>
      </div>
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
      className="panel-bg flex flex-col min-h-screen"
    >
      <header className="cricket-scoreboard px-4 py-4">
        <div className="flex items-center gap-3 max-w-[480px] mx-auto">
          <button
            type="button"
            onClick={onBack}
            data-ocid="history.back.button"
            className="btn-tap text-white/70 hover:text-white p-1.5"
            aria-label="Back"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="scoreboard-title font-display text-xl font-bold text-white tracking-wide">
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
              <p
                className="font-medium"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                No matches saved yet
              </p>
              <p
                className="text-sm"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
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
                className="cricket-card rounded-2xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className="font-display font-semibold"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                    >
                      {m.teamA}
                    </p>
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      vs {m.teamB}
                    </p>
                    {m.result && (
                      <p
                        className="text-xs font-semibold mt-1"
                        style={{ color: "#22c55e" }}
                      >
                        {m.result}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className="font-display font-bold text-xl"
                      style={{ color: "#22c55e" }}
                    >
                      {m.runs}/{m.wickets}
                    </p>
                    {m.team2Runs !== undefined && (
                      <p className="text-sm" style={{ color: "#3b82f6" }}>
                        {m.team2Runs}/{m.team2Wickets ?? 0}
                      </p>
                    )}
                    <p
                      className="text-sm"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {formatOvers(m.overs * 6 + m.balls)} ov
                    </p>
                  </div>
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {formatDate(m.date)}
                </p>
              </div>
            ))
          )}
        </div>
      </main>

      <footer
        className="text-center py-4 text-xs"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: "#22c55e" }}
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

interface ActiveMatchStorage {
  match: MatchState;
  history: HistoryEntry[];
  phase: 1 | 2;
  innings1Result: Innings1Result | null;
}

function loadActiveMatch(): ActiveMatchStorage | null {
  try {
    const data = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function saveActiveMatch(storage: ActiveMatchStorage) {
  localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(storage));
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [match, setMatch] = useState<MatchState | null>(null);
  const [actionHistory, setActionHistory] = useState<HistoryEntry[]>([]);
  const [phase, setPhase] = useState<1 | 2>(1);
  const [innings1Result, setInnings1Result] = useState<Innings1Result | null>(
    null,
  );
  const [localMatches, setLocalMatches] = useState<LocalMatch[]>(
    getLocalHistory(),
  );

  const { data: backendMatches = [] } = useGetAllMatches();
  const saveMatch = useSaveMatch();

  // Restore active match on mount
  useEffect(() => {
    const saved = loadActiveMatch();
    if (saved) {
      setMatch(saved.match);
      setActionHistory(saved.history);
      setPhase(saved.phase ?? 1);
      setInnings1Result(saved.innings1Result ?? null);
      setScreen("scoring");
    }
  }, []);

  // Persist active match
  useEffect(() => {
    if (match) {
      saveActiveMatch({
        match,
        history: actionHistory,
        phase,
        innings1Result,
      });
    }
  }, [match, actionHistory, phase, innings1Result]);

  const handleStart = (teamA: string, teamB: string, totalOvers: number) => {
    const m = defaultMatch(teamA, teamB, totalOvers);
    setMatch(m);
    setActionHistory([]);
    setPhase(1);
    setInnings1Result(null);
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
    if (phase === 2 && innings1Result) {
      const fresh = defaultMatch(match.teamA, match.teamB, match.totalOvers);
      setMatch(fresh);
      setActionHistory([]);
      toast.success("2nd innings reset");
    } else {
      const fresh = defaultMatch(match.teamA, match.teamB, match.totalOvers);
      setMatch(fresh);
      setActionHistory([]);
      setPhase(1);
      setInnings1Result(null);
      localStorage.removeItem(ACTIVE_MATCH_KEY);
      toast.success("Match reset");
    }
  };

  const handleInnings1End = () => {
    if (!match) return;
    setInnings1Result({
      runs: match.runs,
      wickets: match.wickets,
      legalBalls: match.legalBalls,
      totalOvers: match.totalOvers,
    });
    setScreen("innings-break");
  };

  const handleStart2ndInnings = () => {
    if (!match) return;
    const fresh = defaultMatch(match.teamA, match.teamB, match.totalOvers);
    setMatch(fresh);
    setActionHistory([]);
    setPhase(2);
    setScreen("scoring");
    toast.success(
      `${match.teamB} needs ${(innings1Result?.runs ?? 0) + 1} to win!`,
    );
  };

  const handleInnings2End = () => {
    setScreen("result");
  };

  const handleSaveInnings1Only = () => {
    if (!match && !innings1Result) return;
    const i1 = innings1Result;
    if (!i1 || !match) return;
    const overs = Math.floor(i1.legalBalls / 6);
    const balls = i1.legalBalls % 6;
    const entry: LocalMatch = {
      teamA: match.teamA,
      teamB: match.teamB,
      runs: i1.runs,
      wickets: i1.wickets,
      overs,
      balls,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...localMatches];
    setLocalMatches(updated);
    saveLocalHistory(updated);
    saveMatch.mutate({
      team1Name: match.teamA,
      team1Score: i1.runs,
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
    setPhase(1);
    setInnings1Result(null);
  };

  const handleSaveFullMatch = () => {
    if (!match || !innings1Result) return;
    const i1 = innings1Result;
    const i2runs = match.runs;
    const i2wickets = match.wickets;
    const overs1 = Math.floor(i1.legalBalls / 6);
    const balls1 = i1.legalBalls % 6;

    const target = i1.runs + 1;
    const won2nd = i2runs >= target;
    const runsMargin = i1.runs - i2runs;
    const wicketsLeft = 10 - i2wickets;
    let resultText = "";
    if (i2runs === i1.runs && i2wickets >= 10) {
      resultText = "Match Tied";
    } else if (won2nd) {
      resultText = `${match.teamB} won by ${wicketsLeft}W`;
    } else {
      resultText = `${match.teamA} won by ${runsMargin}R`;
    }

    const entry: LocalMatch = {
      teamA: match.teamA,
      teamB: match.teamB,
      runs: i1.runs,
      wickets: i1.wickets,
      overs: overs1,
      balls: balls1,
      team2Runs: i2runs,
      team2Wickets: i2wickets,
      result: resultText,
      date: new Date().toISOString(),
    };
    const updated = [entry, ...localMatches];
    setLocalMatches(updated);
    saveLocalHistory(updated);
    saveMatch.mutate({
      team1Name: match.teamA,
      team1Score: i1.runs,
      team2Name: match.teamB,
      team2Score: i2runs,
      overs: overs1,
      balls: balls1,
    });
    localStorage.removeItem(ACTIVE_MATCH_KEY);
    toast.success("Match saved!");
    setScreen("setup");
    setMatch(null);
    setActionHistory([]);
    setPhase(1);
    setInnings1Result(null);
  };

  const handleSaveSingleInnings = () => {
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
    setPhase(1);
    setInnings1Result(null);
  };

  const chasingTarget =
    phase === 2 && innings1Result ? innings1Result.runs + 1 : undefined;

  return (
    <>
      <Toaster position="top-center" />

      {screen === "setup" && (
        <SetupScreen
          onStart={handleStart}
          onHistory={() => setScreen("history")}
        />
      )}

      {screen === "scoring" && match && phase === 1 && (
        <ScoringScreen
          match={match}
          onUpdateMatch={handleUpdateMatch}
          onReset={handleReset}
          onSave={handleSaveSingleInnings}
          onHistory={() => setScreen("history")}
          actionHistory={actionHistory}
          onUndo={handleUndo}
          onPushHistory={(e) => setActionHistory((h) => [...h, e])}
          onInningsEnd={handleInnings1End}
        />
      )}

      {screen === "scoring" && match && phase === 2 && (
        <ScoringScreen
          match={match}
          onUpdateMatch={handleUpdateMatch}
          onReset={handleReset}
          onSave={handleSaveSingleInnings}
          onHistory={() => setScreen("history")}
          actionHistory={actionHistory}
          onUndo={handleUndo}
          onPushHistory={(e) => setActionHistory((h) => [...h, e])}
          chasingTarget={chasingTarget}
          onInningsEnd={handleInnings2End}
        />
      )}

      {screen === "innings-break" && match && (
        <InningsBreakScreen
          teamA={match.teamA}
          teamB={match.teamB}
          innings1Runs={innings1Result?.runs ?? 0}
          innings1Wickets={innings1Result?.wickets ?? 0}
          innings1Overs={formatOvers(innings1Result?.legalBalls ?? 0)}
          totalOvers={match.totalOvers}
          onStart2ndInnings={handleStart2ndInnings}
          onSaveAndExit={handleSaveInnings1Only}
        />
      )}

      {screen === "result" && match && innings1Result && (
        <MatchResultScreen
          teamA={match.teamA}
          teamB={match.teamB}
          innings1={innings1Result}
          innings2Runs={match.runs}
          innings2Wickets={match.wickets}
          innings2Balls={match.legalBalls}
          onSave={handleSaveFullMatch}
          onNewMatch={() => {
            localStorage.removeItem(ACTIVE_MATCH_KEY);
            setMatch(null);
            setActionHistory([]);
            setPhase(1);
            setInnings1Result(null);
            setScreen("setup");
          }}
        />
      )}

      {screen === "history" && (
        <HistoryScreen
          onBack={() =>
            setScreen(
              match ? (screen === "history" ? "scoring" : "scoring") : "setup",
            )
          }
          backendMatches={backendMatches}
          localMatches={localMatches}
        />
      )}
    </>
  );
}
