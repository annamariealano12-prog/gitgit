"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNoteStore, type Note, type QuizQuestion } from "../../lib/noteStore";
import { Search, Download, ClipboardList, X, Check, Clock, Users } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function StudentDashboard() {
  const router = useRouter();
  // ADDED: sections and addStudentToSection from store
  const { notes, currentUser, submitQuizResult, sections, addStudentToSection } = useNoteStore();
  
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  
  // Quiz State
  const [quizModal, setQuizModal] = useState<QuizQuestion[] | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>(""); 
  const [matchingAnswers, setMatchingAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    if (mounted && (!currentUser || currentUser.role !== "student")) router.push("/"); 
  }, [currentUser, router, mounted]);

  if (!mounted || !currentUser) return null;

  // LOGIC: Find if student is already in a section
  const studentSection = sections.find(s => s.students.some(st => st.id === currentUser.id));

  const filtered = notes.filter((n: Note) => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.subject.toLowerCase().includes(search.toLowerCase())
  );

  // --- LOGIC: PROCESS ANSWERS & SUBMIT ---
  const handleNextOrSubmit = () => {
    if (!quizModal) return;
    const currentQ = quizModal[quizIndex];
    let isCorrect = false;

    if (currentQ.type === "multiple_choice" || currentQ.type === "true_false") {
      isCorrect = selectedAnswer === currentQ.answer;
    } else if (currentQ.type === "identification" || currentQ.type === "fill_blanks") {
      isCorrect = selectedAnswer.trim().toLowerCase() === currentQ.answer?.trim().toLowerCase();
    } else if (currentQ.type === "matching") {
      let allPairsCorrect = true;
      currentQ.pairs?.forEach((p, idx) => {
        if (matchingAnswers[idx] !== p.match) allPairsCorrect = false;
      });
      isCorrect = allPairsCorrect;
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
          date: new Date().toLocaleString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          }) 
        });
      }
    } else {
      setQuizIndex(quizIndex + 1);
      setSelectedAnswer("");
      setMatchingAnswers({});
    }
  };

  return (
   <div className="flex flex-col min-h-screen bg-white dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />
      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">Hello, {currentUser.name}!</h1>
          
          {/* SECTION SELECTOR UI */}
          <div className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded-2xl flex items-center gap-3 border dark:border-zinc-800">
            <div className="pl-3 text-zinc-400"><Users size={18} /></div>
            <select 
              value={studentSection?.id || ""} 
              onChange={(e) => addStudentToSection(Number(e.target.value), currentUser)}
              className="bg-transparent text-sm font-bold text-zinc-700 dark:text-zinc-300 outline-none pr-4 py-2"
            >
              <option value="" disabled>Select your Section</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((n: Note) => (
            <div key={n.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black rounded-md uppercase">{n.subject}</span>
              <h2 className="text-xl font-bold mt-4 mb-2 text-zinc-900 dark:text-white">{n.title}</h2>
              
              <div className="flex flex-col gap-2 pt-5 border-t dark:border-zinc-800">
                {n.fileData && (
                  <a href={n.fileData} download={n.fileName} className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-2">
                    <Download size={14}/> {n.fileName}
                  </a>
                )}
                {n.quiz.length > 0 && (
                  <button 
                    onClick={() => {setQuizModal(n.quiz); setActiveNoteId(n.id); setQuizIndex(0); setQuizScore(0); setQuizDone(false); setSelectedAnswer("");}} 
                    className="w-full py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl flex justify-center items-center gap-2"
                  >
                    <ClipboardList size={14}/> Take Quiz
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* QUIZ MODAL */}
      {quizModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
            {!quizDone ? (
              <>
                <div className="flex justify-between mb-8">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Question {quizIndex + 1}/{quizModal.length}</span>
                  <button onClick={() => setQuizModal(null)} className="dark:text-white"><X size={20}/></button>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-8 leading-tight">
                  {quizModal[quizIndex].question}
                </h3>

                <div className="mb-10">
                  {(quizModal[quizIndex].type === "multiple_choice" || quizModal[quizIndex].type === "true_false") && (
                    <div className="flex flex-col gap-3">
                      {quizModal[quizIndex].choices?.map((c, i) => (
                        <button key={i} onClick={() => setSelectedAnswer(c)} className={`px-5 py-4 rounded-2xl text-left text-sm font-bold border-2 transition-all ${selectedAnswer === c ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-white" : "border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{c}</button>
                      ))}
                    </div>
                  )}

                  {(quizModal[quizIndex].type === "identification" || quizModal[quizIndex].type === "fill_blanks" || quizModal[quizIndex].type === "essay") && (
                    <textarea 
                      value={selectedAnswer} 
                      onChange={(e) => setSelectedAnswer(e.target.value)} 
                      placeholder="Type your answer here..."
                      className="w-full p-4 rounded-2xl border-2 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:border-blue-500 outline-none"
                    />
                  )}

                  {quizModal[quizIndex].type === "matching" && (
                    <div className="flex flex-col gap-4">
                      {quizModal[quizIndex].pairs?.map((p, i) => (
                        <div key={i} className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-zinc-400">{p.prompt}</span>
                          <select 
                            onChange={(e) => setMatchingAnswers({...matchingAnswers, [i]: e.target.value})}
                            className="p-3 rounded-xl border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm dark:text-white"
                          >
                            <option value="">Select Match...</option>
                            {quizModal[quizIndex].pairs?.map((p2, j) => <option key={j} value={p2.match}>{p2.match}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleNextOrSubmit} 
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
                >
                  {quizIndex + 1 === quizModal.length ? "Submit Quiz" : "Next Question"}
                </button>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Check className="text-green-600" size={32} />
                </div>
                <h2 className="text-4xl font-black text-zinc-900 dark:text-white mb-2">{quizScore} / {quizModal.length}</h2>
                <p className="text-zinc-500 font-bold mb-8 uppercase text-[10px] tracking-widest">Submitted to Teacher</p>
                <button onClick={() => setQuizModal(null)} className="w-full py-4 bg-zinc-900 dark:bg-zinc-700 text-white font-black rounded-2xl">BACK TO DASHBOARD</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}