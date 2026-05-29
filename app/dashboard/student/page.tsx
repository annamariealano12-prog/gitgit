"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore, type Note, type QuizQuestion } from "../../lib/noteStore";
import { Search, Download, ClipboardList, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function StudentDashboard() {
  const router = useRouter();
  const { notes, currentUser, submitQuizResult, sections } = useNoteStore();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  const mySections = sections.filter((s) =>
    s.students.some((st) => st.id === currentUser?.id)
  );
  const myNotes = notes.filter((n) => {
    const teacherIds = mySections.map((s) => s.ownerId);
    return teacherIds.includes(n.ownerId);
  });

  // Quiz state
  const [quizModal, setQuizModal] = useState<QuizQuestion[] | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Flashcard state
  const [flashModal, setFlashModal] = useState<{ question: string; answer: string }[] | null>(null);
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

  const openQuiz = (note: Note) => {
    setQuizModal(note.quiz);
    setActiveNoteId(note.id);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
    setSelectedAnswer("");
    setMatchingAnswers({});
  };

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
      let allCorrect = true;
      currentQ.pairs?.forEach((p, idx) => {
        if (matchingAnswers[idx] !== p.match) allCorrect = false;
      });
      isCorrect = allCorrect;
    } else if (currentQ.type === "essay") {
      isCorrect = true;
    }

    const newScore = quizScore + (isCorrect ? 1 : 0);
    setQuizScore(newScore);

    if (quizIndex + 1 >= quizModal.length) {
      setQuizDone(true);
      if (activeNoteId) {
        submitQuizResult(activeNoteId, {
          studentId: currentUser.id,
          studentName: currentUser.name,
          score: newScore,
          total: quizModal.length,
          date: new Date().toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "2-digit", minute: "2-digit",
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

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />
      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">

        {/* Header */}
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

        {/* Notes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((n) => (
            <div
              key={n.id}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm"
            >
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-md uppercase">
                {n.subject || "General"}
              </span>
              <h2 className="text-xl font-bold mt-4 mb-1 text-zinc-900 dark:text-white">{n.title}</h2>
              {n.content && <p className="text-xs text-zinc-400 mb-3">{n.content}</p>}
              <div className="flex flex-col gap-2 pt-4 border-t dark:border-zinc-800">
                {n.fileData && (
                  <a
                    href={n.fileData}
                    download={n.fileName}
                    className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    <Download size={14} /> {n.fileName}
                  </a>
                )}
                {n.flashcards.length > 0 && (
                  <button
                    onClick={() => { setFlashModal(n.flashcards); setFlashIndex(0); setFlashFlipped(false); }}
                    className="w-full py-2.5 bg-purple-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex justify-center items-center gap-2 hover:bg-purple-700 transition"
                  >
                    📇 Flashcards ({n.flashcards.length})
                  </button>
                )}
                {n.quiz.length > 0 && (
                  <button
                    onClick={() => openQuiz(n)}
                    className="w-full py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700 transition"
                  >
                    <ClipboardList size={14} /> Take Quiz ({n.quiz.length} items)
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

      {/* ── FLASHCARD MODAL ── */}
      {flashModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-8">
            <div className="flex justify-between mb-6">
              <span className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                Card {flashIndex + 1} / {flashModal.length}
              </span>
              <button onClick={() => setFlashModal(null)} className="dark:text-white hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>
            <div
              onClick={() => setFlashFlipped(!flashFlipped)}
              className="min-h-[160px] flex items-center justify-center bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition mb-6"
            >
              <p className="text-center text-lg font-bold text-zinc-900 dark:text-white">
                {flashFlipped ? flashModal[flashIndex].answer : flashModal[flashIndex].question}
              </p>
            </div>
            <p className="text-center text-[10px] text-zinc-400 font-bold uppercase mb-6">
              {flashFlipped ? "Answer" : "Question — tap card to reveal answer"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setFlashIndex(Math.max(0, flashIndex - 1)); setFlashFlipped(false); }}
                disabled={flashIndex === 0}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1 dark:text-white"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <button
                onClick={() => { setFlashIndex(Math.min(flashModal.length - 1, flashIndex + 1)); setFlashFlipped(false); }}
                disabled={flashIndex === flashModal.length - 1}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-1 dark:text-white"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUIZ MODAL ── */}
      {quizModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
            {!quizDone ? (
              <>
                <div className="flex justify-between mb-6">
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
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${(quizIndex / quizModal.length) * 100}%` }}
                  />
                </div>

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
                            : "border-zinc-200 dark:border-zinc-700 dark:text-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Identification / Fill Blanks */}
                {(currentQ?.type === "identification" || currentQ?.type === "fill_blanks") && (
                  <input
                    type="text"
                    placeholder="Your answer..."
                    value={selectedAnswer}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:border-blue-600 dark:text-white mb-6"
                  />
                )}

                {/* Matching */}
                {currentQ?.type === "matching" && currentQ.pairs && (
                  <div className="flex flex-col gap-3 mb-6">
                    {currentQ.pairs.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200 flex-1">
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
                  <textarea
                    placeholder="Write your answer here..."
                    value={selectedAnswer}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold outline-none focus:border-blue-600 dark:text-white mb-6 resize-none"
                  />
                )}

                <button
                  onClick={handleNextOrSubmit}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs mt-2"
                >
                  {quizIndex + 1 === quizModal.length ? "Submit Quiz" : "Next →"}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="text-green-600" size={32} />
                </div>
                <p className="text-xs font-black text-zinc-400 uppercase mb-2">Your Score</p>
                <h2 className="text-5xl font-black text-zinc-900 dark:text-white mb-1">
                  {quizScore}
                  <span className="text-2xl text-zinc-400"> / {quizModal.length}</span>
                </h2>
                <p className="text-sm text-zinc-400 font-bold mb-8">
                  {Math.round((quizScore / quizModal.length) * 100)}%
                </p>
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