import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, RotateCcw, Trophy, Undo2, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "setup" | "scoring" | "history";

interface Batsman {
  name: string;
  runs: number;
  balls: number;
}

interface Bowler {
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}

type ActionType =
  | { type: "run"; runs: number }
  | { type: "wicket" }
  | { type: "wide" }
  | { type: "noball" }
  | { type: "bye"; runs: number }
  | { type: "legbye"; runs: number };

interface ActionEntry {
  action: ActionType;
  prevState: InningsSnapshot;
}

interface InningsSnapshot {
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: { wides: number; noBalls: number; byes: number; legByes: number };
  batsmen: [Batsman, Batsman];
  strikerIndex: 0 | 1;
  bowler: Bowler;
  partnership: number;
}

interface InningsState extends InningsSnapshot {
  history: ActionEntry[];
}

interface MatchSetup {
  teamA: string;
  teamB: string;
  totalOvers: number;
}

interface MatchHistory {
  id: string;
  teamA: string;
  teamB: string;
  totalOvers: number;
  innings1: { runs: number; wickets: number; overs: string };
  innings2?: { runs: number; wickets: number; overs: string };
  result: string;
  date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function vibrate(ms = 40) {
  try {
    navigator.vibrate(ms);
  } catch (_) {}
}

function oversDisplay(legalBalls: number): string {
  return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

function oversDecimal(legalBalls: number): number {
  const complete = Math.floor(legalBalls / 6);
  const partial = legalBalls % 6;
  return complete + partial / 6;
}

function calcRR(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return "0.00";
  return (runs / oversDecimal(legalBalls)).toFixed(2);
}

function initialInnings(): InningsState {
  return {
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    batsmen: [
      { name: "Batsman 1", runs: 0, balls: 0 },
      { name: "Batsman 2", runs: 0, balls: 0 },
    ],
    strikerIndex: 0,
    bowler: { name: "Bowler 1", overs: 0, balls: 0, runs: 0, wickets: 0 },
    partnership: 0,
    history: [],
  };
}

function snapshotInnings(s: InningsState): InningsSnapshot {
  return {
    runs: s.runs,
    wickets: s.wickets,
    legalBalls: s.legalBalls,
    extras: { ...s.extras },
    batsmen: [{ ...s.batsmen[0] }, { ...s.batsmen[1] }],
    strikerIndex: s.strikerIndex,
    bowler: { ...s.bowler },
    partnership: s.partnership,
  };
}

function loadHistory(): MatchHistory[] {
  try {
    return JSON.parse(localStorage.getItem("cricket_history") || "[]");
  } catch {
    return [];
  }
}

function saveHistory(matches: MatchHistory[]) {
  localStorage.setItem("cricket_history", JSON.stringify(matches));
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>("setup");
  const [match, setMatch] = useState<MatchSetup>({
    teamA: "",
    teamB: "",
    totalOvers: 20,
  });
  const [innings, setInnings] = useState<1 | 2>(1);
  const [innings1, setInnings1] = useState<InningsState>(initialInnings());
  const [innings2, setInnings2] = useState<InningsState>(initialInnings());
  const [scoreKey, setScoreKey] = useState(0);
  const [lastRunsDisplay, setLastRunsDisplay] = useState<string | null>(null);

  const currentInnings = innings === 1 ? innings1 : innings2;
  const setCurrentInnings = innings === 1 ? setInnings1 : setInnings2;

  const isInningsOver = (s: InningsState) =>
    s.wickets >= 10 || s.legalBalls >= match.totalOvers * 6;

  const target = innings1.runs + 1;

  function applyAction(action: ActionType) {
    vibrate();
    setScoreKey((k) => k + 1);
    // Update last runs display
    switch (action.type) {
      case "run":
        setLastRunsDisplay(`+${action.runs} runs`);
        break;
      case "wicket":
        setLastRunsDisplay("WICKET!");
        break;
      case "wide":
        setLastRunsDisplay("+1 wide");
        break;
      case "noball":
        setLastRunsDisplay("+1 no ball");
        break;
      case "bye":
        setLastRunsDisplay(`+${action.runs} bye`);
        break;
      case "legbye":
        setLastRunsDisplay(`+${action.runs} leg bye`);
        break;
    }
    setCurrentInnings((prev) => {
      const snap = snapshotInnings(prev);
      let s = {
        ...prev,
        extras: { ...prev.extras },
        batsmen: [{ ...prev.batsmen[0] }, { ...prev.batsmen[1] }] as [
          Batsman,
          Batsman,
        ],
        bowler: { ...prev.bowler },
      };

      const striker = s.strikerIndex;
      const nonStriker = striker === 0 ? 1 : 0;

      switch (action.type) {
        case "run": {
          const r = action.runs;
          s.runs += r;
          s.legalBalls += 1;
          s.batsmen[striker].runs += r;
          s.batsmen[striker].balls += 1;
          s.bowler.runs += r;
          s.bowler.balls += 1;
          s.partnership += r;
          let swapStrike = r % 2 !== 0;
          if (s.legalBalls % 6 === 0) {
            swapStrike = !swapStrike;
            s.bowler.overs += 1;
            s.bowler.balls = 0;
          }
          if (swapStrike) s.strikerIndex = nonStriker as 0 | 1;
          break;
        }
        case "wicket": {
          s.wickets += 1;
          s.legalBalls += 1;
          s.batsmen[striker].balls += 1;
          s.bowler.balls += 1;
          s.bowler.wickets += 1;
          s.partnership = 0;
          s.batsmen[striker] = {
            name: `Batsman ${s.wickets + 1}`,
            runs: 0,
            balls: 0,
          };
          if (s.legalBalls % 6 === 0) {
            s.bowler.overs += 1;
            s.bowler.balls = 0;
            s.strikerIndex = nonStriker as 0 | 1;
          }
          break;
        }
        case "wide": {
          s.runs += 1;
          s.extras.wides += 1;
          s.bowler.runs += 1;
          break;
        }
        case "noball": {
          s.runs += 1;
          s.extras.noBalls += 1;
          s.bowler.runs += 1;
          break;
        }
        case "bye": {
          const r = action.runs;
          s.runs += r;
          s.legalBalls += 1;
          s.extras.byes += r;
          s.batsmen[striker].balls += 1;
          s.bowler.balls += 1;
          s.partnership += r;
          let swap = r % 2 !== 0;
          if (s.legalBalls % 6 === 0) {
            swap = !swap;
            s.bowler.overs += 1;
            s.bowler.balls = 0;
          }
          if (swap) s.strikerIndex = nonStriker as 0 | 1;
          break;
        }
        case "legbye": {
          const r = action.runs;
          s.runs += r;
          s.legalBalls += 1;
          s.extras.legByes += r;
          s.batsmen[striker].balls += 1;
          s.bowler.balls += 1;
          s.partnership += r;
          let swap2 = r % 2 !== 0;
          if (s.legalBalls % 6 === 0) {
            swap2 = !swap2;
            s.bowler.overs += 1;
            s.bowler.balls = 0;
          }
          if (swap2) s.strikerIndex = nonStriker as 0 | 1;
          break;
        }
      }

      s.history = [...prev.history, { action, prevState: snap }];
      return s;
    });
  }

  function handleUndo() {
    vibrate(30);
    setLastRunsDisplay(null);
    setCurrentInnings((prev) => {
      if (prev.history.length === 0) return prev;
      const last = prev.history[prev.history.length - 1];
      return {
        ...last.prevState,
        history: prev.history.slice(0, -1),
      };
    });
  }

  function handleEndInnings() {
    vibrate(80);
    setLastRunsDisplay(null);
    if (innings === 1) {
      setInnings(2);
      setInnings2(initialInnings());
    } else {
      // Save match to history
      const s1 = innings1;
      const s2 = currentInnings;
      const won =
        s2.runs >= target
          ? `${match.teamB || "Team B"} won by ${10 - s2.wickets} wickets`
          : s2.wickets >= 10 || s2.legalBalls >= match.totalOvers * 6
            ? `${match.teamA || "Team A"} won by ${s1.runs - s2.runs} runs`
            : "Match in progress";
      const result = won;
      const newMatch: MatchHistory = {
        id: Date.now().toString(),
        teamA: match.teamA || "Team A",
        teamB: match.teamB || "Team B",
        totalOvers: match.totalOvers,
        innings1: {
          runs: s1.runs,
          wickets: s1.wickets,
          overs: oversDisplay(s1.legalBalls),
        },
        innings2: {
          runs: s2.runs,
          wickets: s2.wickets,
          overs: oversDisplay(s2.legalBalls),
        },
        result,
        date: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      };
      const history = loadHistory();
      saveHistory([newMatch, ...history]);
      setView("setup");
      setInnings(1);
      setInnings1(initialInnings());
      setInnings2(initialInnings());
    }
  }

  function handleReset() {
    vibrate(100);
    setLastRunsDisplay(null);
    setView("setup");
    setInnings(1);
    setInnings1(initialInnings());
    setInnings2(initialInnings());
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <AnimatePresence mode="wait">
        {view === "setup" && (
          <SetupScreen
            key="setup"
            match={match}
            setMatch={setMatch}
            onStart={() => {
              setInnings(1);
              setInnings1(initialInnings());
              setInnings2(initialInnings());
              setLastRunsDisplay(null);
              setView("scoring");
            }}
            onHistory={() => setView("history")}
          />
        )}
        {view === "scoring" && (
          <ScoringScreen
            key="scoring"
            match={match}
            innings={innings}
            state={currentInnings}
            innings1Score={innings1.runs}
            target={target}
            scoreKey={scoreKey}
            lastRunsDisplay={lastRunsDisplay}
            onAction={applyAction}
            onUndo={handleUndo}
            onReset={handleReset}
            onEndInnings={handleEndInnings}
            isOver={isInningsOver(currentInnings)}
          />
        )}
        {view === "history" && (
          <HistoryScreen key="history" onBack={() => setView("setup")} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SetupScreen ──────────────────────────────────────────────────────────────

interface SetupProps {
  match: MatchSetup;
  setMatch: React.Dispatch<React.SetStateAction<MatchSetup>>;
  onStart: () => void;
  onHistory: () => void;
}

function SetupScreen({ match, setMatch, onStart, onHistory }: SetupProps) {
  const canStart =
    match.teamA.trim().length > 0 && match.teamB.trim().length > 0;

  return (
    <motion.div
      className="flex flex-col h-full max-w-[480px] mx-auto w-full overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero header with green gradient */}
      <div className="scoreboard-gradient px-5 pt-10 pb-8 text-center">
        <div className="text-5xl mb-3">🏏</div>
        <h1 className="font-display text-3xl font-bold text-primary-foreground tracking-tight">
          Cricket Scorer
        </h1>
        <p className="text-primary-foreground/70 mt-1 text-sm">
          Professional match tracking
        </p>
      </div>

      {/* Form area */}
      <div className="flex-1 px-4 pt-5 flex flex-col gap-4">
        {/* Team names card */}
        <div className="bg-card rounded-2xl p-5 border border-border card-shadow flex flex-col gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Team A — Batting First
            </div>
            <Input
              id="team-a"
              data-ocid="setup.team_a.input"
              placeholder="e.g. Mumbai Indians"
              value={match.teamA}
              onChange={(e) =>
                setMatch((m) => ({ ...m, teamA: e.target.value }))
              }
              className="bg-background border-border text-foreground placeholder:text-muted-foreground text-base h-12 rounded-xl focus-visible:ring-primary"
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Team B — Batting Second
            </div>
            <Input
              id="team-b"
              data-ocid="setup.team_b.input"
              placeholder="e.g. Chennai Super Kings"
              value={match.teamB}
              onChange={(e) =>
                setMatch((m) => ({ ...m, teamB: e.target.value }))
              }
              className="bg-background border-border text-foreground placeholder:text-muted-foreground text-base h-12 rounded-xl focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Overs card */}
        <div className="bg-card rounded-2xl p-5 border border-border card-shadow">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Total Overs
          </div>
          <div data-ocid="setup.overs.select" className="flex gap-3">
            {[5, 10, 20].map((o) => (
              <button
                type="button"
                key={o}
                onClick={() => {
                  vibrate();
                  setMatch((m) => ({ ...m, totalOvers: o }));
                }}
                className={`flex-1 h-14 rounded-xl font-display font-bold text-xl transition-all tap-active ${
                  match.totalOvers === o
                    ? "bg-primary text-primary-foreground btn-shadow-green"
                    : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 mt-1 pb-8">
          <button
            type="button"
            data-ocid="setup.start.primary_button"
            onClick={() => {
              if (canStart) onStart();
            }}
            disabled={!canStart}
            className={`w-full h-16 rounded-2xl font-display font-bold text-xl transition-all tap-active ${
              canStart
                ? "bg-primary text-primary-foreground btn-shadow-green"
                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
            }`}
          >
            Start Match 🏏
          </button>
          <button
            type="button"
            data-ocid="setup.history.secondary_button"
            onClick={onHistory}
            className="w-full h-12 rounded-xl font-semibold text-base bg-secondary text-secondary-foreground border border-border tap-active hover:bg-secondary/80"
          >
            Match History
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4 text-[11px] text-muted-foreground">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          className="underline hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </div>
    </motion.div>
  );
}

// ─── ScoringScreen ────────────────────────────────────────────────────────────

interface ScoringProps {
  match: MatchSetup;
  innings: 1 | 2;
  state: InningsState;
  innings1Score: number;
  target: number;
  scoreKey: number;
  lastRunsDisplay: string | null;
  onAction: (a: ActionType) => void;
  onUndo: () => void;
  onReset: () => void;
  onEndInnings: () => void;
  isOver: boolean;
}

function ScoringScreen({
  match,
  innings,
  state,
  innings1Score: _innings1Score,
  target,
  scoreKey,
  lastRunsDisplay,
  onAction,
  onUndo,
  onReset,
  onEndInnings,
  isOver,
}: ScoringProps) {
  const totalBalls = match.totalOvers * 6;
  const remainingBalls = totalBalls - state.legalBalls;
  const remainingOversDecimal = remainingBalls / 6;
  const rr = calcRR(state.runs, state.legalBalls);
  const rrq =
    innings === 2 && remainingOversDecimal > 0
      ? ((target - state.runs) / remainingOversDecimal).toFixed(2)
      : null;

  const ballsThisOver = state.legalBalls % 6;
  const won2ndInnings = innings === 2 && state.runs >= target;

  const isLastRunsWicket = lastRunsDisplay === "WICKET!";

  return (
    <motion.div
      className="flex flex-col h-full max-w-[480px] mx-auto w-full"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 px-3 pb-4">
          {/* ── Header: CRICKET UMPIRE | +X runs ── */}
          <div className="flex items-center justify-between pt-4 pb-1 px-1">
            <div>
              <span className="font-display font-bold text-foreground text-lg tracking-widest uppercase">
                CRICKET UMPIRE
              </span>
              <div className="mt-0.5">
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0 border-primary/40 text-primary bg-primary/5"
                >
                  {innings === 1 ? "1st Innings" : "2nd Innings"} ·{" "}
                  {match.teamA || "Team A"} vs {match.teamB || "Team B"}
                </Badge>
              </div>
            </div>
            <AnimatePresence mode="wait">
              {lastRunsDisplay && (
                <motion.span
                  key={lastRunsDisplay + scoreKey}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-sm font-semibold ${
                    isLastRunsWicket
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {lastRunsDisplay}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* ── Scoreboard card: dark green, centered score ── */}
          <div className="scoreboard-dark rounded-2xl p-5 card-shadow">
            {/* Score */}
            <div className="text-center mb-3">
              <motion.div
                key={scoreKey}
                className="font-mono font-bold text-primary-foreground leading-none score-hero"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 0.18 }}
              >
                {state.runs}/{state.wickets}
              </motion.div>
            </div>

            {/* Ball dots row + overs */}
            <div className="flex items-center justify-center gap-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((ballNum) => {
                  const filled = ballNum <= ballsThisOver;
                  return (
                    <div
                      key={ballNum}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        filled
                          ? "bg-primary-foreground border-primary-foreground"
                          : "bg-transparent border-primary-foreground/35"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-primary-foreground/70 text-sm font-mono ml-1">
                {oversDisplay(state.legalBalls)} ov
              </span>
              <span className="text-primary-foreground/50 text-xs mx-1">|</span>
              <span className="text-primary-foreground/70 text-sm font-mono">
                RR {rr}
              </span>
            </div>

            {/* 2nd innings: target info */}
            {innings === 2 && (
              <div className="mt-3 pt-3 border-t border-primary-foreground/20 flex items-center justify-center gap-4 text-xs text-primary-foreground/80">
                <span>
                  Target:{" "}
                  <span className="font-mono font-bold text-boundary">
                    {target}
                  </span>
                </span>
                <span className="text-primary-foreground/40">·</span>
                <span>
                  Need:{" "}
                  <span className="font-mono font-bold text-primary-foreground">
                    {Math.max(0, target - state.runs)}
                  </span>
                </span>
                {rrq && (
                  <>
                    <span className="text-primary-foreground/40">·</span>
                    <span>
                      Req RR:{" "}
                      <span className="font-mono font-bold text-primary-foreground">
                        {rrq}
                      </span>
                    </span>
                  </>
                )}
              </div>
            )}
            {innings === 1 && (
              <div className="mt-2 text-center text-xs text-primary-foreground/50">
                {match.teamA || "Team A"} batting · {match.totalOvers} overs
              </div>
            )}
          </div>

          {/* ── Innings over / won banner ── */}
          {(isOver || won2ndInnings) && (
            <motion.div
              className="bg-primary/10 border-2 border-primary rounded-2xl p-5 text-center card-shadow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="text-3xl mb-2">{won2ndInnings ? "🏆" : "✅"}</div>
              <div className="font-display font-bold text-foreground text-lg mb-3">
                {won2ndInnings
                  ? "Match Won!"
                  : innings === 1
                    ? "1st Innings Complete"
                    : "Innings Over"}
              </div>
              <button
                type="button"
                data-ocid="scoring.end_innings.button"
                onClick={onEndInnings}
                className="w-full h-13 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base tap-active btn-shadow-green"
              >
                {innings === 1 ? "Start 2nd Innings ▶" : "End Match & Save"}
              </button>
            </motion.div>
          )}

          {/* ── Scoring buttons ── */}
          {!isOver && !won2ndInnings && (
            <div className="flex flex-col gap-3">
              {/* RUNS label */}
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
                RUNS
              </div>

              {/* Row 1: 0, 1, 2 */}
              <div className="grid grid-cols-3 gap-2.5">
                {([0, 1, 2] as const).map((r) => (
                  <RunButton key={r} runs={r} onAction={onAction} />
                ))}
              </div>

              {/* Row 2: 3, 4, 6 */}
              <div className="grid grid-cols-3 gap-2.5">
                <RunButton runs={3} onAction={onAction} />
                <BoundaryButton
                  runs={4}
                  label="4"
                  onAction={onAction}
                  ocid="scoring.runs_4.button"
                />
                <BoundaryButton
                  runs={6}
                  label="6"
                  onAction={onAction}
                  ocid="scoring.runs_6.button"
                />
              </div>

              {/* WICKET full-width */}
              <button
                type="button"
                data-ocid="scoring.wicket.delete_button"
                onClick={() => {
                  if (state.wickets < 10) onAction({ type: "wicket" });
                }}
                disabled={state.wickets >= 10}
                className="w-full h-16 rounded-2xl wicket-gradient text-white font-display font-bold text-2xl tracking-wide tap-active btn-shadow-red disabled:opacity-40 transition-all flex items-center justify-center gap-3"
              >
                <span className="text-2xl">🏏</span> WICKET
              </button>

              {/* EXTRAS label */}
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1 mt-0.5">
                EXTRAS (+1 RUN)
              </div>

              {/* Extras 2x2 */}
              <div className="grid grid-cols-2 gap-2.5">
                <ExtrasButton
                  label="WIDE"
                  ocid="scoring.wide.button"
                  variant="blue"
                  onClick={() => onAction({ type: "wide" })}
                />
                <ExtrasButton
                  label="NO BALL"
                  ocid="scoring.noball.button"
                  variant="noball"
                  onClick={() => onAction({ type: "noball" })}
                />
                <ExtrasButton
                  label="BYE"
                  ocid="scoring.bye.button"
                  variant="teal"
                  onClick={() => onAction({ type: "bye", runs: 1 })}
                />
                <ExtrasButton
                  label="LEG BYE"
                  ocid="scoring.legbye.button"
                  variant="green"
                  onClick={() => onAction({ type: "legbye", runs: 1 })}
                />
              </div>

              {/* Bottom row: Undo | Reset */}
              <div className="grid grid-cols-2 gap-2.5 mt-1 pb-4">
                <button
                  type="button"
                  data-ocid="scoring.undo.button"
                  onClick={onUndo}
                  disabled={state.history.length === 0}
                  className="h-14 rounded-2xl bg-undo-btn text-undo-btn-foreground font-semibold text-base flex items-center justify-center gap-2 tap-active btn-shadow disabled:opacity-40 transition-all"
                >
                  <Undo2 size={17} /> Undo
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      data-ocid="scoring.reset.button"
                      className="h-14 rounded-2xl bg-reset-btn text-reset-btn-foreground font-semibold text-base flex items-center justify-center gap-2 tap-active btn-shadow"
                    >
                      <RotateCcw size={17} /> Reset
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border max-w-[320px] rounded-2xl card-shadow">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-foreground">
                        Reset match?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        All progress will be lost.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        data-ocid="scoring.reset.cancel_button"
                        className="bg-secondary border-border text-foreground"
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        data-ocid="scoring.reset.confirm_button"
                        onClick={onReset}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pb-2 text-[10px] text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              className="underline hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              caffeine.ai
            </a>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Run button 0-3: dark cricket green */
function RunButton({
  runs,
  onAction,
}: { runs: 0 | 1 | 2 | 3; onAction: (a: ActionType) => void }) {
  const ocids = [
    "scoring.runs_0.button",
    "scoring.runs_1.button",
    "scoring.runs_2.button",
    "scoring.runs_3.button",
  ] as const;
  return (
    <button
      type="button"
      data-ocid={ocids[runs]}
      onClick={() => onAction({ type: "run", runs })}
      className="h-16 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-3xl tap-active btn-shadow-green hover:opacity-90 transition-opacity"
    >
      {runs}
    </button>
  );
}

/** Boundary button 4/6: warm golden amber */
function BoundaryButton({
  runs,
  label,
  onAction,
  ocid,
}: {
  runs: 4 | 6;
  label: string;
  onAction: (a: ActionType) => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={() => onAction({ type: "run", runs })}
      className="h-16 rounded-2xl bg-boundary text-boundary-foreground font-display font-bold text-3xl tap-active btn-shadow-gold hover:opacity-90 transition-opacity"
    >
      {label}
    </button>
  );
}

/** Extras button: blue=Wide, noball=amber-brown, teal=Bye, green=LegBye */
function ExtrasButton({
  label,
  ocid,
  variant,
  onClick,
}: {
  label: string;
  ocid: string;
  variant: "blue" | "noball" | "teal" | "green";
  onClick: () => void;
}) {
  const variantCls = {
    blue: "bg-blue-extra text-blue-extra-foreground btn-shadow-blue",
    noball: "bg-noball-extra text-noball-extra-foreground btn-shadow-noball",
    teal: "bg-teal-extra text-teal-extra-foreground btn-shadow-teal",
    green: "bg-bye-extra text-bye-extra-foreground btn-shadow-green",
  };
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className={`h-14 rounded-2xl font-bold text-sm tap-active hover:opacity-90 transition-opacity leading-tight px-2 tracking-wide ${
        variantCls[variant]
      }`}
    >
      {label}
    </button>
  );
}

// ─── HistoryScreen ────────────────────────────────────────────────────────────

function HistoryScreen({ onBack }: { onBack: () => void }) {
  const matches = loadHistory();

  return (
    <motion.div
      className="flex flex-col h-full max-w-[480px] mx-auto w-full"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with green gradient */}
      <div className="scoreboard-gradient flex items-center gap-3 px-4 pt-6 pb-5">
        <button
          type="button"
          data-ocid="history.back.button"
          onClick={() => {
            vibrate();
            onBack();
          }}
          className="h-9 w-9 rounded-xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center tap-active text-primary-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-display font-bold text-xl text-primary-foreground">
          Match History
        </h2>
      </div>

      <ScrollArea className="flex-1 px-4 pt-4 pb-4">
        {matches.length === 0 ? (
          <div
            data-ocid="history.empty_state"
            className="flex flex-col items-center justify-center h-48 text-muted-foreground"
          >
            <div className="text-4xl mb-3">📋</div>
            <div className="font-semibold text-foreground">
              No matches recorded yet
            </div>
            <div className="text-sm mt-1">Complete a match to see it here</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {matches.map((m, i) => (
              <div
                key={m.id}
                data-ocid={`history.item.${i + 1}`}
                className="bg-card rounded-2xl border border-border p-4 card-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-display font-bold text-foreground text-base">
                      {m.teamA} vs {m.teamB}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.date} · {m.totalOvers} overs
                    </div>
                  </div>
                  <Trophy size={18} className="text-boundary shrink-0 mt-0.5" />
                </div>

                <Separator className="my-2.5 bg-border" />

                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                      {m.teamA}
                    </div>
                    <div className="font-mono font-bold text-foreground text-lg">
                      {m.innings1.runs}/{m.innings1.wickets}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      ({m.innings1.overs} ov)
                    </div>
                  </div>
                  {m.innings2 && (
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">
                        {m.teamB}
                      </div>
                      <div className="font-mono font-bold text-foreground text-lg">
                        {m.innings2.runs}/{m.innings2.wickets}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        ({m.innings2.overs} ov)
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5 bg-primary/8 rounded-lg px-2.5 py-1.5">
                  <Zap size={12} className="text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    {m.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </motion.div>
  );
}
