"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore, type Note, type QuizQuestion } from "../../lib/noteStore";
import { Search, Download, ClipboardList, X, Check, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function StudentDashboard() {
  const router = useRouter();
  const store = useNoteStore();
  const { notes, currentUser, submitQuizResult, sections } = store;

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  // Derive fresh on every render so any store update is reflected immediately
  const mySections = sections.filter((s) =>
    s.students.some((st) => st.id === currentUser?.id)
  );
  const myNotes = notes.filter((n) => {
    const teacherIds = mySections.map((s) => s.ownerId);
    return teacherIds.includes(n.ownerId);
  });

  // ── Quiz state ──────────────────────────────────────────────────────────────
  const [quizModal, setQuizModal] = useState<QuizQuestion[] | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<{ score: number; total: number } | null>(null);

  // ── Flashcard state ─────────────────────────────────────────────────────────
  const [flashModal, setFlashModal] = useState<{ question: string; answer: string }[] | null>(null);
  const [flashNoteTitle, setFlashNoteTitle] = useState("");
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && (!currentUser || currentUser.role !== "student")) router.push("/");
  }, [mounted, currentUser, router]);

  if (!mounted || !currentUser) return null;

  const filtered = myNotes.filter(
    (n: Note) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.subject.toLowerCase().includes(search.toLowerCase())
  );

  // ── Open quiz ───────────────────────────────────────────────────────────────
  const openQuiz = (note: Note) => {
    setQuizModal(note.quiz);
    setActiveNoteId(note.id);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
    setSubmittedScore(null);
    setSelectedAnswer("");
    setMatchingAnswers({});
  };

  // ── Answer handling ─────────────────────────────────────────────────────────
  const handleNextOrSubmit = () => {
    if (!quizModal) return;
    const currentQ = quizModal[quizIndex];
    let isCorrect = false;

    if (currentQ.type === "multiple_choice" || currentQ.type === "true_false") {
      isCorrect = selectedAnswer === currentQ.answer;
    } else if (currentQ.type === "identification" || currentQ.type === "fill_blanks") {
      isCorrect =
        selectedAnswer.trim().toLowerCase() === currentQ.answer?.trim().toLowerCase();
    } else if (currentQ.type === "matching") {
      isCorrect = (currentQ.pairs ?? []).every((p, idx) => matchingAnswers[idx] === p.match);
    } else if (currentQ.type === "essay") {
      isCorrect = true; // essays are auto-credited
    }

    const newScore = quizScore + (isCorrect ? 1 : 0);
    setQuizScore(newScore);

    const isLast = quizIndex + 1 >= quizModal.length;

    if (isLast) {
      setQuizDone(true);
      setSubmittedScore({ score: newScore, total: quizModal.length });

      if (activeNoteId !== null) {
        submitQuizResult(activeNoteId, {
          studentId: currentUser.id,
          studentName: currentUser.name,
          score: newScore,
          total: quizModal.length,
          date: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    } else {
      setQuizIndex(quizIndex + 1);
      setSelectedAnswer("");
      setMatchingAnswers({});
    }
  };

  const currentQ = quizModal ? quizModal[quizIndex] : null;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const answerIsReady = (): boolean => {
    if (!currentQ) return false;
    if (currentQ.type === "multiple_choice" || currentQ.type === "true_false")
      return selectedAnswer !== "";
    if (currentQ.type === "identification" || currentQ.type === "fill_blanks")
      return selectedAnswer.trim() !== "";
    if (currentQ.type === "matching")
      return (currentQ.pairs ?? []).every((_, i) => (matchingAnswers[i] ?? "").trim() !== "");
    return true; // essay
  };

  const pct = submittedScore
    ? Math.round((submittedScore.score / submittedScore.total) * 100)
    : 0;

  const gradeLabel = (p: number) => {
    if (p >= 90) return { label: "Excellent!", color: "text-green-600" };
    if (p >= 75) return { label: "Good job!", color: "text-blue-500" };
    if (p >= 50) return { label: "Keep it up!", color: "text-yellow-500" };
    return { label: "Keep practicing!", color: "text-red-400" };
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />

      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
              Hello, {currentUser.name}!
            </h1>
            {mySections.length > 0 && (
              <p className="text-sm font-bold text-zinc-400 mt-1">
                Section:{" "}
                <span className="text-green-600">{mySections.map((s) => s.name).join(", ")}</span>
              </p>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none text-sm dark:text-white font-bold border dark:border-zinc-700"
            />
          </div>
        </div>

        {/* ── Notes Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((n) => (
            <div
              key={n.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm"
            >
              {/* Subject badge */}
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-md uppercase">
                {n.subject || "General"}
              </span>

              <h2 className="text-xl font-bold mt-4 mb-1 text-zinc-900 dark:text-white">{n.title}</h2>
              {n.content && <p className="text-xs text-zinc-400 mb-3">{n.content}</p>}

              {/* Activity indicator row */}
              {(n.flashcards.length > 0 || n.quiz.length > 0) && (
                <div className="flex gap-2 flex-wrap mb-3">
                  {n.flashcards.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40">
                      <Layers size={10} /> {n.flashcards.length} flashcard{n.flashcards.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {n.quiz.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40">
                      <ClipboardList size={10} /> {n.quiz.length}-item quiz
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4 border-t dark:border-zinc-800">
                {/* Download attachment */}
                {n.fileData && (
                  <a
                    href={n.fileData}
                    download={n.fileName}
                    className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    <Download size={14} /> {n.fileName}
                  </a>
                )}

                {/* Flashcards button — only appears when teacher has added flashcards */}
                {n.flashcards.length > 0 && (
                  <button
                    onClick={() => {
                      setFlashModal(n.flashcards);
                      setFlashNoteTitle(n.title);
                      setFlashIndex(0);
                      setFlashFlipped(false);
                    }}
                    className="w-full py-2.5 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex justify-center items-center gap-2 hover:bg-purple-700 active:scale-[0.98] transition"
                  >
                    📇 Flashcards ({n.flashcards.length})
                  </button>
                )}

                {/* Quiz button — only appears when teacher has added quiz questions */}
                {n.quiz.length > 0 && (
                  <button
                    onClick={() => openQuiz(n)}
                    className="w-full py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition"
                  >
                    <ClipboardList size={14} /> Take Quiz ({n.quiz.length} item{n.quiz.length !== 1 ? "s" : ""})
                  </button>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full text-center py-20 text-zinc-400 font-bold uppercase text-xs">
              {myNotes.length === 0 ? "No materials available yet." : "No results found."}
            </p>
          )}
        </div>
      </main>

      {/* ══ FLASHCARD MODAL ════════════════════════════════════════════════════ */}
      {flashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between mb-2">
              <div>
                <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                  Card {flashIndex + 1} / {flashModal.length}
                </span>
                <p className="text-[10px] text-zinc-400 font-bold truncate max-w-[200px]">{flashNoteTitle}</p>
              </div>
              <button onClick={() => setFlashModal(null)} className="dark:text-white hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1 mb-5">
              {flashModal.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === flashIndex ? "bg-purple-600" : i < flashIndex ? "bg-purple-300" : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>

            <div
              onClick={() => setFlashFlipped(!flashFlipped)}
              className="min-h-[160px] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition mb-2 select-none"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-3">
                {flashFlipped ? "Answer" : "Question"}
              </span>
              <p className="text-center text-lg font-bold text-zinc-900 dark:text-white">
                {flashFlipped ? flashModal[flashIndex].answer : flashModal[flashIndex].question}
              </p>
            </div>
            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase mb-6">
              Tap card to {flashFlipped ? "see question" : "reveal answer"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => { setFlashIndex(Math.max(0, flashIndex - 1)); setFlashFlipped(false); }}
                disabled={flashIndex === 0}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() => { setFlashIndex(Math.min(flashModal.length - 1, flashIndex + 1)); setFlashFlipped(false); }}
                disabled={flashIndex === flashModal.length - 1}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ QUIZ MODAL ═════════════════════════════════════════════════════════ */}
      {quizModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">

            {/* ── In-progress ── */}
            {!quizDone ? (
              <>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                    Question {quizIndex + 1} / {quizModal.length}
                  </span>
                  <button onClick={() => setQuizModal(null)} className="dark:text-white hover:text-red-500 transition">
                    <X size={20} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-6">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((quizIndex) / quizModal.length) * 100}%` }}
                  />
                </div>

                {/* Question type badge */}
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-3 inline-block">
                  {currentQ?.type.replace("_", " ")}
                </span>

                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">
                  {currentQ?.question}
                </h3>

                {/* Multiple Choice */}
                {currentQ?.type === "multiple_choice" && currentQ.choices && (
                  <div className="flex flex-col gap-3 mb-6">
                    {currentQ.choices.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedAnswer(c)}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-left transition border-2 ${
                          selectedAnswer === c
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-zinc-200 dark:border-zinc-700 dark:text-white hover:border-blue-400"
                        }`}
                      >
                        <span className="inline-block w-6 h-6 rounded-full border-2 mr-3 text-center text-xs leading-5
                          border-current opacity-50">
                          {String.fromCharCode(65 + i)}
                        </span>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* True / False */}
                {currentQ?.type === "true_false" && (
                  <div className="flex gap-3 mb-6">
                    {["True", "False"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedAnswer(opt)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition ${
                          selectedAnswer === opt
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700"
                            : "border-zinc-200 dark:border-zinc-700 dark:text-white hover:border-blue-400"
                        }`}
                      >
                        {opt === "True" ? "✓ True" : "✗ False"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Identification / Fill in the Blanks */}
                {(currentQ?.type === "identification" || currentQ?.type === "fill_blanks") && (
                  <input
                    type="text"
                    placeholder="Your answer..."
                    value={selectedAnswer}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && answerIsReady() && handleNextOrSubmit()}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:border-blue-600 dark:text-white mb-6"
                    autoFocus
                  />
                )}

                {/* Matching */}
                {currentQ?.type === "matching" && currentQ.pairs && (
                  <div className="flex flex-col gap-3 mb-6">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Type the matching answer for each prompt</p>
                    {currentQ.pairs.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 flex-1 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 rounded-xl">
                          {p.prompt}
                        </span>
                        <input
                          type="text"
                          placeholder="Match..."
                          value={matchingAnswers[i] || ""}
                          onChange={(e) =>
                            setMatchingAnswers({ ...matchingAnswers, [i]: e.target.value })
                          }
                          className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:border-blue-600 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Essay */}
                {currentQ?.type === "essay" && (
                  <>
                    <textarea
                      placeholder="Write your answer here..."
                      value={selectedAnswer}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:border-blue-600 dark:text-white mb-2 resize-none"
                    />
                    <p className="text-[10px] text-zinc-400 font-bold mb-4">Essays are recorded and auto-credited.</p>
                  </>
                )}

                <button
                  onClick={handleNextOrSubmit}
                  disabled={!answerIsReady()}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {quizIndex + 1 === quizModal.length ? "Submit Quiz ✓" : "Next →"}
                </button>
              </>
            ) : (
              /* ── Results screen ── */
              <div className="text-center py-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  pct >= 75 ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"
                }`}>
                  <Check className={pct >= 75 ? "text-green-600" : "text-yellow-500"} size={36} />
                </div>

                <p className="text-xs font-black text-zinc-400 uppercase mb-2">Quiz Complete!</p>
                <h2 className="text-5xl font-black text-zinc-900 dark:text-white mb-1">
                  {submittedScore?.score}
                  <span className="text-2xl text-zinc-400"> / {submittedScore?.total}</span>
                </h2>
                <p className={`text-2xl font-black mb-1 ${gradeLabel(pct).color}`}>{pct}%</p>
                <p className={`text-sm font-bold mb-6 ${gradeLabel(pct).color}`}>{gradeLabel(pct).label}</p>

                {/* Score sent notice */}
                <div className="mb-6 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/40 rounded-2xl">
                  <p className="text-[11px] font-black text-green-700 dark:text-green-400 uppercase tracking-wide">
                    ✓ Score submitted to your teacher
                  </p>
                </div>

                <button
                  onClick={() => setQuizModal(null)}
                  className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 text-white font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-zinc-800 transition"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}