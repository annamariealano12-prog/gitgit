"use client";
import { useState, useEffect, useRef } from "react";
import {
  FileText, Users, Trash2, Plus, ArrowLeft, BookOpen,
  Upload, ChevronDown, X, Download,
  AlertCircle, CheckCircle2, KeyRound, UserCheck, Eye, EyeOff, Pencil,
  ClipboardList, Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useNoteStore, type Note, type QuizQuestion } from "../../lib/noteStore";
import Navbar from "../../components/Navbar";

// ─── CSV Parser ────────────────────────────────────────────────────────────────
function parseCSVIds(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const headerKeywords = [
    "studentid", "student_id", "student id", "studid",
    "id", "idno", "id no", "id number", "idnumber", "no",
  ];
  const ids: string[] = [];
  let startIdx = 0;
  if (lines.length > 0) {
    const firstCell = lines[0].split(",")[0]
      .trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " ");
    if (headerKeywords.includes(firstCell)) startIdx = 1;
  }
  for (let i = startIdx; i < lines.length; i++) {
    const id = lines[i].split(",")[0].trim().replace(/['"]/g, "");
    if (id) ids.push(id);
  }
  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseExcelIds(file: File): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let XLSX: any;
  try {
    XLSX = await import("xlsx");
  } catch {
    throw new Error("Excel support requires the 'xlsx' package. Please run: npm install xlsx");
  }
  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rows.length) return [];
  const headerKeywords = ["studentid", "student_id", "student id", "id", "idno", "no"];
  let idColIdx = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstRow = rows[0].map((c: any) =>
    String(c || "").toLowerCase().trim().replace(/\s+/g, " ")
  );
  for (const kw of headerKeywords) {
    const idx = firstRow.findIndex(
      (h: string) => h === kw || h.replace(/\s/g, "") === kw.replace(/\s/g, "")
    );
    if (idx !== -1) { idColIdx = idx; break; }
  }
  const cellVal = String(rows[0][idColIdx] || "");
  const isHeader = isNaN(Number(cellVal.replace(/[-/]/g, "")));
  const startIdx = isHeader ? 1 : 0;
  return rows
    .slice(startIdx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any[]) => String(row[idColIdx] || "").trim())
    .filter(Boolean);
}

function downloadTemplate() {
  const csv = "StudentID\n2021-00001\n2021-00002\n2021-00003\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "student_id_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Quiz Results CSV Download ─────────────────────────────────────────────────
function downloadQuizResultsCSV(
  sectionName: string,
  results: Array<{
    studentName: string;
    noteTitle: string;
    score: number;
    total: number;
    date: string;
  }>
) {
  const header = "Student Name,Quiz Title,Score,Total Score,Date";
  const rows = results.map((r) =>
    [
      `"${r.studentName}"`,
      `"${r.noteTitle}"`,
      r.score,
      r.total,
      `"${r.date}"`,
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sectionName.replace(/\s+/g, "_")}_quiz_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Credential Setup Modal ────────────────────────────────────────────────────
function CredentialModal({
  studentId,
  onSave,
  onClose,
  error,
}: {
  studentId: string;
  onSave: (name: string, password: string) => void;
  onClose: () => void;
  error: string;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const inputCls =
    "w-full pl-11 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent focus:border-green-600 text-zinc-900 dark:text-white rounded-xl outline-none font-bold text-sm placeholder:text-zinc-400";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-8 w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-white">Set Credentials</h3>
            <p className="text-[11px] font-bold text-zinc-400 mt-0.5 uppercase tracking-widest">{studentId}</p>
          </div>
          <button onClick={onClose} className="text-zinc-300 hover:text-red-500 transition"><X size={20} /></button>
        </div>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold mb-5 leading-relaxed">
          Assign a <strong>full name</strong> and <strong>password</strong> for this student.
          They will use their Student ID + this password to log in.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[11px] font-black uppercase tracking-wide border border-red-100 dark:border-red-900/50">
            {error}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="relative">
            <UserCheck className="absolute left-3 top-[0.85rem] text-zinc-300 dark:text-zinc-600" size={17} />
            <input type="text" placeholder="Student Full Name" value={name}
              onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="off" />
          </div>
          <div className="relative">
            <KeyRound className="absolute left-3 top-[0.85rem] text-zinc-300 dark:text-zinc-600" size={17} />
            <input type={showPass ? "text" : "password"} placeholder="Password (max 8 chars)"
              value={password} maxLength={8} onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-11`} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-[0.85rem] text-zinc-400 hover:text-green-600 transition">
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button onClick={() => onSave(name, password)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition shadow-lg mt-1">
            Save & Activate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const router = useRouter();
  const {
    notes, addNote, deleteNote, updateNote,
    sections, addSection, deleteSection, removeStudentFromSection,
    studentRosters, importStudentIds, removeRosterEntry,
    teacherRegisterStudent,
    currentUser,
  } = useNoteStore();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "upload" | "sections">("notes");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const myNotes = notes.filter((n) => n.ownerId === currentUser?.id);
  const mySections = sections.filter((s) => s.ownerId === currentUser?.id);

  // Quiz / Flashcard builder
  const [expandedNoteId, setExpandedNoteId] = useState<{
    type: "flash" | "quiz" | null; id: number | null;
  }>({ type: null, id: null });
  const [quizType, setQuizType] = useState<QuizQuestion["type"]>("multiple_choice");
  const [newQuestion, setNewQuestion] = useState("");
  const [mcChoices, setMcChoices] = useState(["", "", "", ""]);
  const [mcCorrect, setMcCorrect] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [matchingPairs, setMatchingPairs] = useState([{ prompt: "", match: "" }]);
  const [newFlash, setNewFlash] = useState({ question: "", answer: "" });

  // Section / Upload
  const [newSectionName, setNewSectionName] = useState("");
  const [newNote, setNewNote] = useState({ title: "", subject: "", content: "" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingSection, setImportingSection] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  // Credential modal
  const [credModal, setCredModal] = useState<{ studentId: string; sectionId: number } | null>(null);
  const [credError, setCredError] = useState("");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && (!currentUser || currentUser.role !== "teacher")) router.push("/");
  }, [mounted, currentUser, router]);

  if (!mounted || !currentUser) return null;

  const inputCls =
    "w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl outline-none text-sm font-bold placeholder:text-zinc-400";

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddQuestion = (note: Note) => {
    if (!newQuestion.trim()) return;
    const q: QuizQuestion = { type: quizType, question: newQuestion };
    if (quizType === "multiple_choice") {
      q.choices = mcChoices; q.answer = mcChoices[mcCorrect];
    } else if (quizType === "matching") {
      q.pairs = matchingPairs;
    } else {
      q.answer = textAnswer;
    }
    updateNote(note.id, { quiz: [...note.quiz, q] });
    setNewQuestion(""); setTextAnswer(""); setMcChoices(["", "", "", ""]);
    setMcCorrect(0); setMatchingPairs([{ prompt: "", match: "" }]);
  };

  const handleAddFlashcard = (note: Note) => {
    if (!newFlash.question || !newFlash.answer) return;
    updateNote(note.id, { flashcards: [...note.flashcards, { ...newFlash }] });
    setNewFlash({ question: "", answer: "" });
  };

  const handleAddSection = () => {
    if (newSectionName.trim() && currentUser) {
      addSection(newSectionName.trim(), currentUser.id);
      setNewSectionName("");
    }
  };

  async function handleUpload() {
    if (!newNote.title || !currentUser) return;
    setUploading(true);
    let fileName: string | undefined;
    let fileData: string | undefined;
    if (uploadedFile) {
      fileName = uploadedFile.name;
      fileData = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(uploadedFile);
      });
    }
    setTimeout(() => {
      addNote({ ...newNote, ownerId: currentUser.id, fileName, fileData, flashcards: [], quiz: [] });
      setNewNote({ title: "", subject: "", content: "" });
      setUploadedFile(null);
      setUploading(false);
      setUploadSuccess(true);
      setTimeout(() => { setUploadSuccess(false); setActiveTab("notes"); }, 1500);
    }, 800);
  }

  const handleImportClick = (sectionId: number) => {
    setImportingSection(sectionId);
    setImportMsg(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || importingSection === null) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    try {
      let ids: string[] = [];
      if (ext === "csv") {
        ids = parseCSVIds(await file.text());
      } else if (ext === "xlsx" || ext === "xls") {
        ids = await parseExcelIds(file);
      } else {
        setImportMsg({ type: "error", text: "Please upload a .csv or .xlsx/.xls file." });
        e.target.value = ""; return;
      }
      if (!ids.length) {
        setImportMsg({ type: "error", text: "No student IDs found. Check your file format." });
        e.target.value = ""; return;
      }
      const err = importStudentIds(importingSection, ids);
      if (err) {
        setImportMsg({ type: "error", text: err });
      } else {
        setImportMsg({ type: "success", text: `${ids.length} student ID(s) imported. Set their credentials below.` });
      }
    } catch (err: unknown) {
      setImportMsg({ type: "error", text: (err instanceof Error ? err.message : null) || "Failed to parse file." });
    }
    e.target.value = "";
    setImportingSection(null);
  };

  const handleSaveCredentials = (name: string, password: string) => {
    if (!credModal) return;
    setCredError("");
    const err = teacherRegisterStudent(credModal.sectionId, credModal.studentId, name, password);
    if (err) { setCredError(err); }
    else { setCredModal(null); setCredError(""); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />

      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

      {credModal && (
        <CredentialModal
          studentId={credModal.studentId}
          onSave={handleSaveCredentials}
          onClose={() => { setCredModal(null); setCredError(""); }}
          error={credError}
        />
      )}

      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
            Welcome, {currentUser.name} 👋
          </h1>
          <p className="text-zinc-500 font-bold mt-1 text-sm uppercase tracking-wide">Teacher Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 shadow-sm">
            <FileText className="text-green-700" />
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">{myNotes.length}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Notes</div>
            </div>
          </div>
          <div
            onClick={() => setActiveTab("sections")}
            className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 cursor-pointer hover:border-green-500 transition shadow-sm"
          >
            <Users className="text-green-700" />
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">{mySections.length}</div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Sections</div>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 shadow-sm">
            <BookOpen className="text-green-700" />
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white">
                {[...new Set(myNotes.map((n) => n.subject).filter(Boolean))].length}
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-400">Subjects</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b dark:border-zinc-800 pb-4">
          {(["notes", "upload", "sections"] as const).map((tab) => (
            <button key={tab}
              onClick={() => { setActiveTab(tab); if (tab === "sections") setSelectedSectionId(null); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${
                activeTab === tab
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-white dark:bg-zinc-900 text-zinc-500 border dark:border-zinc-800"
              }`}
            >
              {tab === "upload" ? "+ Upload Note" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ NOTES TAB ══════════════════════════════════════════════════════════ */}
        {activeTab === "notes" && (
          <div className="grid grid-cols-1 gap-6">
            {myNotes.map((note) => (
              <div key={note.id} className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-8 shadow-sm">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black uppercase px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">
                    {note.subject || "General"}
                  </span>
                  <button onClick={() => deleteNote(note.id)} className="text-red-300 hover:text-red-500 transition">
                    <Trash2 size={20} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">{note.title}</h3>
                {note.content && <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{note.content}</p>}
                {note.fileName && <p className="text-xs text-zinc-400 font-bold mb-4">📎 {note.fileName}</p>}

                {/* Activity summary — visible at a glance */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                    note.flashcards.length > 0
                      ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-800/40"
                      : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-700"
                  }`}>
                    <Layers size={10} />
                    {note.flashcards.length > 0 ? `${note.flashcards.length} flashcard${note.flashcards.length !== 1 ? "s" : ""}` : "No flashcards"}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${
                    note.quiz.length > 0
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/40"
                      : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 border-zinc-100 dark:border-zinc-700"
                  }`}>
                    <ClipboardList size={10} />
                    {note.quiz.length > 0 ? `${note.quiz.length}-item quiz` : "No quiz"}
                  </span>
                  {(note.quizResults ?? []).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/40">
                      ✓ {(note.quizResults ?? []).length} submission{(note.quizResults ?? []).length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => setExpandedNoteId(
                      expandedNoteId.id === note.id && expandedNoteId.type === "flash"
                        ? { type: null, id: null } : { type: "flash", id: note.id }
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-black uppercase hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
                  >
                    <Layers size={13} /> Flashcards ({note.flashcards.length}) <ChevronDown size={14} className={expandedNoteId.id === note.id && expandedNoteId.type === "flash" ? "rotate-180" : ""} />
                  </button>
                  <button
                    onClick={() => setExpandedNoteId(
                      expandedNoteId.id === note.id && expandedNoteId.type === "quiz"
                        ? { type: null, id: null } : { type: "quiz", id: note.id }
                    )}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                  >
                    <ClipboardList size={13} /> Quiz ({note.quiz.length}) <ChevronDown size={14} className={expandedNoteId.id === note.id && expandedNoteId.type === "quiz" ? "rotate-180" : ""} />
                  </button>
                </div>

                {/* Flashcards Panel */}
                {expandedNoteId.id === note.id && expandedNoteId.type === "flash" && (
                  <div className="border-t dark:border-zinc-800 pt-6 mt-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-3">
                      {note.flashcards.length === 0
                        ? "No flashcards yet — add one below. They will appear instantly on the student side."
                        : `${note.flashcards.length} flashcard${note.flashcards.length !== 1 ? "s" : ""} — visible to students now`}
                    </p>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {note.flashcards.map((fc, i) => (
                        <div key={i} className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 flex justify-between items-start">
                          <div>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">{fc.question}</p>
                            <p className="text-xs text-zinc-400 mt-1">{fc.answer}</p>
                          </div>
                          <button
                            onClick={() => updateNote(note.id, { flashcards: note.flashcards.filter((_, idx) => idx !== i) })}
                            className="text-red-300 hover:text-red-500 ml-4"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input className={inputCls} placeholder="Question" value={newFlash.question}
                        onChange={(e) => setNewFlash({ ...newFlash, question: e.target.value })} />
                      <input className={inputCls} placeholder="Answer" value={newFlash.answer}
                        onChange={(e) => setNewFlash({ ...newFlash, answer: e.target.value })} />
                      <button onClick={() => handleAddFlashcard(note)}
                        className="py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase hover:bg-purple-700 transition">
                        + Add Flashcard
                      </button>
                    </div>
                  </div>
                )}

                {/* Quiz Panel */}
                {expandedNoteId.id === note.id && expandedNoteId.type === "quiz" && (
                  <div className="border-t dark:border-zinc-800 pt-6 mt-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-3">
                      {note.quiz.length === 0
                        ? "No quiz questions yet — add one below. They will appear instantly on the student side."
                        : `${note.quiz.length} question${note.quiz.length !== 1 ? "s" : ""} — quiz is live for students`}
                    </p>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {note.quiz.map((q, i) => (
                        <div key={i} className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                              {q.type.replace("_", " ")}
                            </span>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-200 mt-1">{q.question}</p>
                          </div>
                          <button
                            onClick={() => updateNote(note.id, { quiz: note.quiz.filter((_, idx) => idx !== i) })}
                            className="text-red-300 hover:text-red-500 ml-4"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      <select value={quizType} onChange={(e) => setQuizType(e.target.value as QuizQuestion["type"])} className={inputCls}>
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="identification">Identification</option>
                        <option value="fill_blanks">Fill in the Blanks</option>
                        <option value="matching">Matching</option>
                        <option value="essay">Essay</option>
                      </select>
                      <input className={inputCls} placeholder="Question" value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)} />
                      {quizType === "multiple_choice" && (
                        <>
                          {mcChoices.map((c, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input className={`${inputCls} flex-1`} placeholder={`Choice ${i + 1}`} value={c}
                                onChange={(e) => { const arr = [...mcChoices]; arr[i] = e.target.value; setMcChoices(arr); }} />
                              <input type="radio" name="correct" checked={mcCorrect === i}
                                onChange={() => setMcCorrect(i)} className="accent-green-600 w-4 h-4" />
                            </div>
                          ))}
                          <p className="text-[10px] text-zinc-400 font-bold">Select correct answer with the radio button.</p>
                        </>
                      )}
                      {quizType === "true_false" && (
                        <select className={inputCls} value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)}>
                          <option value="">Select Answer</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      )}
                      {(quizType === "identification" || quizType === "fill_blanks") && (
                        <input className={inputCls} placeholder="Correct Answer" value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)} />
                      )}
                      {quizType === "matching" && (
                        <>
                          {matchingPairs.map((p, i) => (
                            <div key={i} className="flex gap-2">
                              <input className={`${inputCls} flex-1`} placeholder="Prompt" value={p.prompt}
                                onChange={(e) => { const arr = [...matchingPairs]; arr[i].prompt = e.target.value; setMatchingPairs(arr); }} />
                              <input className={`${inputCls} flex-1`} placeholder="Match" value={p.match}
                                onChange={(e) => { const arr = [...matchingPairs]; arr[i].match = e.target.value; setMatchingPairs(arr); }} />
                            </div>
                          ))}
                          <button onClick={() => setMatchingPairs([...matchingPairs, { prompt: "", match: "" }])}
                            className="text-xs text-blue-500 font-black text-left hover:text-blue-700 transition">
                            + Add Pair
                          </button>
                        </>
                      )}
                      <button onClick={() => handleAddQuestion(note)}
                        className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition">
                        + Add Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {myNotes.length === 0 && (
              <p className="text-center py-20 text-zinc-400 font-bold uppercase text-xs">
                No notes yet. Upload one to get started.
              </p>
            )}
          </div>
        )}

        {/* ══ UPLOAD TAB ═════════════════════════════════════════════════════════ */}
        {activeTab === "upload" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-10 max-w-xl mx-auto shadow-sm">
            <h3 className="text-2xl font-black mb-8 text-zinc-900 dark:text-white text-center uppercase tracking-tight">
              Upload New Note
            </h3>
            {uploadSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-xl text-xs font-black text-center uppercase">
                Note published successfully!
              </div>
            )}
            <div className="flex flex-col gap-5">
              <input type="text" placeholder="Note Title *" value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className={inputCls} />
              <input type="text" placeholder="Subject" value={newNote.subject}
                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })} className={inputCls} />
              <textarea placeholder="Description (optional)" value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows={3} className={`${inputCls} resize-none`} />
              <div
                onClick={() => document.getElementById("note-file-input")?.click()}
                className="border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all"
              >
                <Upload className="mx-auto mb-2 text-zinc-300" />
                <p className="text-sm font-bold text-zinc-500">
                  {uploadedFile ? uploadedFile.name : "Click to attach a file (optional)"}
                </p>
                <input id="note-file-input" type="file" className="hidden"
                  onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} />
              </div>
              <button onClick={handleUpload} disabled={uploading || !newNote.title}
                className="bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-green-700 transition-all disabled:opacity-50">
                {uploading ? "Publishing..." : "Publish Note"}
              </button>
            </div>
          </div>
        )}

        {/* ══ SECTIONS TAB ═══════════════════════════════════════════════════════ */}
        {activeTab === "sections" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-10 shadow-sm">

            {selectedSectionId === null && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Active Sections
                  </h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="New Section..." value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
                      className="px-4 py-2 border dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-sm outline-none font-bold" />
                    <button onClick={handleAddSection}
                      className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition">
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
                      How to enroll students
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-300 font-bold leading-relaxed">
                      1. Import a <strong>.csv / .xlsx</strong> file with Student IDs.
                      2. Click <Pencil className="inline w-3 h-3" /> on each ID to assign a name & password.
                      3. Share those credentials with students — they log in directly.
                    </p>
                  </div>
                  <button onClick={downloadTemplate}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase hover:bg-blue-700 transition">
                    <Download size={13} /> Download Template
                  </button>
                </div>

                {importMsg && (
                  <div className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-xs font-bold ${
                    importMsg.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50"
                  }`}>
                    {importMsg.type === "success"
                      ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                      : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
                    <span>{importMsg.text}</span>
                    <button onClick={() => setImportMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mySections.map((section) => {
                    const totalRoster = studentRosters.filter((r) => r.sectionId === section.id).length;
                    const pendingCount = studentRosters.filter((r) => r.sectionId === section.id && !r.isRegistered).length;
                    const noCredCount = studentRosters.filter((r) => r.sectionId === section.id && !r.isRegistered && !r.password).length;
                    // Count quiz submissions from enrolled students in this section
                    const sIds = new Set(section.students.map((st) => st.id));
                    const submissionCount = notes.reduce((acc, n) =>
                      acc + (n.quizResults ?? []).filter((r) => sIds.has(r.studentId)).length, 0
                    );

                    return (
                      <div key={section.id}
                        className="border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 hover:border-green-400 transition flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-xl text-zinc-900 dark:text-white">{section.name}</h4>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                {section.students.length} Enrolled
                                {pendingCount > 0 && <span className="ml-1 text-yellow-500">· {pendingCount} Pending</span>}
                                {noCredCount > 0 && <span className="ml-1 text-red-400">· {noCredCount} Need Setup</span>}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleImportClick(section.id)} title="Import Student IDs"
                                className="text-zinc-300 hover:text-blue-500 transition"><Upload size={20} /></button>
                              <button onClick={() => deleteSection(section.id)} title="Delete section"
                                className="text-zinc-300 hover:text-red-500 transition"><Trash2 size={20} /></button>
                            </div>
                          </div>

                          {/* Submission count badge */}
                          {submissionCount > 0 && (
                            <div className="mb-3 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800/40 inline-flex items-center gap-1.5">
                              <ClipboardList size={11} className="text-green-600" />
                              <span className="text-[10px] font-black text-green-700 dark:text-green-400">
                                {submissionCount} quiz submission{submissionCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          )}

                          <div className="mb-5">
                            {totalRoster > 0 ? (
                              <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                  📋 {totalRoster} ID{totalRoster !== 1 ? "s" : ""} in roster
                                  {pendingCount > 0 && ` · ${pendingCount} not yet logged in`}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                <p className="text-[10px] font-black text-zinc-400 italic">No roster yet — click ↑ to import</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button onClick={() => setSelectedSectionId(section.id)}
                          className="w-full py-3 bg-white dark:bg-zinc-900 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition shadow-sm">
                          View Dashboard
                        </button>
                      </div>
                    );
                  })}
                  {mySections.length === 0 && (
                    <p className="col-span-3 text-center py-10 text-zinc-300 italic text-xs">
                      No sections yet. Create one above.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── Section Detail Dashboard ── */}
            {selectedSectionId !== null &&
              (() => {
                const cur = sections.find((s) => s.id === selectedSectionId);
                if (!cur) return null;

                const sIds = new Set(cur.students.map((st) => st.id));
                const results = notes
                  .flatMap((n) =>
                    (n.quizResults || [])
                      .filter((r) => sIds.has(r.studentId))
                      .map((r) => ({ ...r, noteTitle: n.title }))
                  )
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                const pendingRoster = studentRosters.filter((r) => r.sectionId === cur.id && !r.isRegistered);
                const needsSetup = pendingRoster.filter((r) => !r.password);
                const readyToLogin = pendingRoster.filter((r) => !!r.password);

                // Average score
                const avgScore = results.length > 0
                  ? Math.round(results.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / results.length)
                  : null;

                return (
                  <div>
                    <button onClick={() => setSelectedSectionId(null)}
                      className="mb-8 flex items-center gap-2 text-sm text-zinc-400 font-black uppercase hover:text-green-600 transition">
                      <ArrowLeft size={16} /> Back
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-3xl font-black text-zinc-900 dark:text-white">{cur.name}</h3>
                        {avgScore !== null && (
                          <p className="text-sm font-bold text-zinc-400 mt-1">
                            Class average: <span className="text-green-600">{avgScore}%</span> across {results.length} submission{results.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleImportClick(cur.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition">
                        <Upload size={14} /> Import More IDs
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">

                      {/* Needs Setup */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          Needs Setup ({needsSetup.length})
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm">
                          {needsSetup.length === 0 && (
                            <p className="p-6 text-xs text-zinc-300 italic text-center">All IDs have credentials.</p>
                          )}
                          {needsSetup.map((entry) => (
                            <div key={entry.studentId} className="p-4 flex justify-between items-center gap-2">
                              <span className="text-xs font-mono font-black text-zinc-600 dark:text-zinc-300 truncate">{entry.studentId}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => { setCredError(""); setCredModal({ studentId: entry.studentId, sectionId: cur.id }); }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-black uppercase transition"
                                >
                                  <KeyRound size={11} /> Setup
                                </button>
                                <button onClick={() => removeRosterEntry(entry.studentId, cur.id)}
                                  className="text-red-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ready / Pending Login */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                          Ready / Pending ({readyToLogin.length})
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm max-h-80 overflow-y-auto">
                          {readyToLogin.length === 0 && (
                            <p className="p-6 text-xs text-zinc-300 italic text-center">No students awaiting first login.</p>
                          )}
                          {readyToLogin.map((entry) => (
                            <div key={entry.studentId} className="p-4 flex justify-between items-center gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-black text-zinc-700 dark:text-zinc-200 truncate">{entry.studentName}</p>
                                <p className="text-[10px] font-mono text-zinc-400 truncate">{entry.studentId}</p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => { setCredError(""); setCredModal({ studentId: entry.studentId, sectionId: cur.id }); }}
                                  className="text-zinc-300 hover:text-blue-500 transition"><Pencil size={14} /></button>
                                <button onClick={() => removeRosterEntry(entry.studentId, cur.id)}
                                  className="text-red-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Enrolled Students */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          Enrolled ({cur.students.length})
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm max-h-80 overflow-y-auto">
                          {cur.students.length === 0 && (
                            <p className="p-6 text-xs text-zinc-300 italic text-center">No students have logged in yet.</p>
                          )}
                          {cur.students.map((st) => {
                            const studentSubmissions = results.filter((r) => r.studentId === st.id);
                            return (
                              <div key={st.id} className="p-4 flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{st.name}</p>
                                  {studentSubmissions.length > 0 && (
                                    <p className="text-[10px] text-zinc-400 font-bold">
                                      {studentSubmissions.length} quiz{studentSubmissions.length !== 1 ? "zes" : ""} taken
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => removeStudentFromSection(cur.id, st.id)}
                                  className="text-red-300 hover:text-red-500 transition"><Trash2 size={16} /></button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Quiz Activity ── */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          Quiz Results
                          {results.length > 0 && (
                            <button
                              onClick={() => downloadQuizResultsCSV(cur.name, results)}
                              title="Download quiz results as CSV"
                              className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase transition"
                            >
                              <Download size={11} /> CSV
                            </button>
                          )}
                        </h4>

                        {results.length === 0 ? (
                          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-3xl p-8 text-center shadow-sm">
                            <ClipboardList className="mx-auto mb-3 text-zinc-300" size={28} />
                            <p className="text-xs text-zinc-300 italic">No quiz submissions yet.</p>
                            <p className="text-[10px] text-zinc-200 dark:text-zinc-600 mt-1">
                              Scores will appear here automatically when students submit.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {results.map((res, i) => {
                              const pct = Math.round((res.score / res.total) * 100);
                              return (
                                <div key={i} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="font-black text-sm text-zinc-900 dark:text-white leading-tight">{res.studentName}</p>
                                    <span className={`text-sm font-black ${pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-500" : "text-red-400"}`}>
                                      {res.score}/{res.total}
                                    </span>
                                  </div>
                                  {/* Mini progress bar */}
                                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1 mb-2">
                                    <div
                                      className={`h-1 rounded-full ${pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] font-bold text-zinc-400 uppercase truncate">📝 {res.noteTitle}</p>
                                  <p className="text-[10px] text-zinc-300 mt-1">{res.date}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })()}
          </div>
        )}
      </main>
    </div>
  );
}