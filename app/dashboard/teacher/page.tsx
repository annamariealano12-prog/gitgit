"use client";
import { useState, useEffect, useRef } from "react";
import {
  FileText, Users, Trash2, Plus, ArrowLeft, BookOpen,
  Upload, ClipboardList, ChevronDown, X, Download,
  AlertCircle, CheckCircle2,
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
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/\s+/g, " ");
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
    throw new Error(
      "Excel support requires the 'xlsx' package. Please run: npm install xlsx"
    );
  }

  const ab = await file.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  if (!rows.length) return [];

  // Auto-detect the student ID column
  const headerKeywords = ["studentid", "student_id", "student id", "id", "idno", "no"];
  let idColIdx = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstRow = rows[0].map((c: any) =>
    String(c || "").toLowerCase().trim().replace(/\s+/g, " ")
  );
  for (const kw of headerKeywords) {
    const idx = firstRow.findIndex((h: string) => h === kw || h.replace(/\s/g, "") === kw.replace(/\s/g, ""));
    if (idx !== -1) { idColIdx = idx; break; }
  }

  // Skip header row if it looks like text
  const cellVal = String(rows[0][idColIdx] || "");
  const isHeader = isNaN(Number(cellVal.replace(/[-/]/g, "")));
  const startIdx = isHeader ? 1 : 0;

  return rows
    .slice(startIdx)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any[]) => String(row[idColIdx] || "").trim())
    .filter(Boolean);
}

// ─── Download CSV Template ─────────────────────────────────────────────────────
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

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const router = useRouter();
  const {
    notes, addNote, deleteNote, updateNote,
    sections, addSection, deleteSection, removeStudentFromSection,
    studentRosters, importStudentIds, removeRosterEntry,
    currentUser,
  } = useNoteStore();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "upload" | "sections">("notes");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const myNotes = notes.filter((n) => n.ownerId === currentUser?.id);
  const mySections = sections.filter((s) => s.ownerId === currentUser?.id);

  // Quiz / Flashcard builder state
  const [expandedNoteId, setExpandedNoteId] = useState<{
    type: "flash" | "quiz" | null;
    id: number | null;
  }>({ type: null, id: null });
  const [quizType, setQuizType] = useState<QuizQuestion["type"]>("multiple_choice");
  const [newQuestion, setNewQuestion] = useState("");
  const [mcChoices, setMcChoices] = useState(["", "", "", ""]);
  const [mcCorrect, setMcCorrect] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [matchingPairs, setMatchingPairs] = useState([{ prompt: "", match: "" }]);
  const [newFlash, setNewFlash] = useState({ question: "", answer: "" });

  // Section state
  const [newSectionName, setNewSectionName] = useState("");

  // Upload state
  const [newNote, setNewNote] = useState({ title: "", subject: "", content: "" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingSection, setImportingSection] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && (!currentUser || currentUser.role !== "teacher"))
      router.push("/");
  }, [mounted, currentUser, router]);

  if (!mounted || !currentUser) return null;

  // ── Helpers ──
  const inputCls =
    "w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl outline-none text-sm font-bold placeholder:text-zinc-400";

  const handleAddQuestion = (note: Note) => {
    if (!newQuestion.trim()) return;
    const q: QuizQuestion = { type: quizType, question: newQuestion };
    if (quizType === "multiple_choice") {
      q.choices = mcChoices;
      q.answer = mcChoices[mcCorrect];
    } else if (quizType === "matching") {
      q.pairs = matchingPairs;
    } else {
      q.answer = textAnswer;
    }
    updateNote(note.id, { quiz: [...note.quiz, q] });
    setNewQuestion(""); setTextAnswer(""); setMcChoices(["", "", "", ""]);
    setMatchingPairs([{ prompt: "", match: "" }]);
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

  // ── Import handlers ──
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
        const text = await file.text();
        ids = parseCSVIds(text);
      } else if (ext === "xlsx" || ext === "xls") {
        ids = await parseExcelIds(file);
      } else {
        setImportMsg({ type: "error", text: "Please upload a .csv or .xlsx/.xls file." });
        e.target.value = "";
        return;
      }

      if (!ids.length) {
        setImportMsg({ type: "error", text: "No student IDs found. Check your file format." });
        e.target.value = "";
        return;
      }

      const err = importStudentIds(importingSection, ids);
      if (err) {
        setImportMsg({ type: "error", text: err });
      } else {
        setImportMsg({
          type: "success",
          text: `${ids.length} student ID(s) imported successfully.`,
        });
      }
    } catch (err: unknown) {
      setImportMsg({ type: "error", text: (err instanceof Error ? err.message : null) || "Failed to parse file." });
    }

    e.target.value = "";
    setImportingSection(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
            Welcome, {currentUser.name} 👋
          </h1>
          <p className="text-zinc-500 font-bold mt-1 text-sm uppercase tracking-wide">
            Teacher Dashboard
          </p>
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
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "sections") setSelectedSectionId(null);
              }}
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
              <div
                key={note.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-8 shadow-sm"
              >
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black uppercase px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">
                    {note.subject || "General"}
                  </span>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-red-300 hover:text-red-500 transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">{note.title}</h3>
                {note.content && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{note.content}</p>
                )}
                {note.fileName && (
                  <p className="text-xs text-zinc-400 font-bold mb-4">📎 {note.fileName}</p>
                )}

                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() =>
                      setExpandedNoteId(
                        expandedNoteId.id === note.id && expandedNoteId.type === "flash"
                          ? { type: null, id: null }
                          : { type: "flash", id: note.id }
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-xl text-xs font-black uppercase"
                  >
                    Flashcards ({note.flashcards.length}) <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() =>
                      setExpandedNoteId(
                        expandedNoteId.id === note.id && expandedNoteId.type === "quiz"
                          ? { type: null, id: null }
                          : { type: "quiz", id: note.id }
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-xs font-black uppercase"
                  >
                    Quiz ({note.quiz.length}) <ChevronDown size={14} />
                  </button>
                </div>

                {/* Flashcards Panel */}
                {expandedNoteId.id === note.id && expandedNoteId.type === "flash" && (
                  <div className="border-t dark:border-zinc-800 pt-6 mt-2">
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {note.flashcards.map((fc, i) => (
                        <div
                          key={i}
                          className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 flex justify-between items-start"
                        >
                          <div>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-200">{fc.question}</p>
                            <p className="text-xs text-zinc-400 mt-1">{fc.answer}</p>
                          </div>
                          <button
                            onClick={() =>
                              updateNote(note.id, {
                                flashcards: note.flashcards.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-red-300 hover:text-red-500 ml-4"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        className={inputCls}
                        placeholder="Question"
                        value={newFlash.question}
                        onChange={(e) => setNewFlash({ ...newFlash, question: e.target.value })}
                      />
                      <input
                        className={inputCls}
                        placeholder="Answer"
                        value={newFlash.answer}
                        onChange={(e) => setNewFlash({ ...newFlash, answer: e.target.value })}
                      />
                      <button
                        onClick={() => handleAddFlashcard(note)}
                        className="py-2.5 bg-purple-600 text-white rounded-xl text-xs font-black uppercase"
                      >
                        Add Flashcard
                      </button>
                    </div>
                  </div>
                )}

                {/* Quiz Panel */}
                {expandedNoteId.id === note.id && expandedNoteId.type === "quiz" && (
                  <div className="border-t dark:border-zinc-800 pt-6 mt-2">
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {note.quiz.map((q, i) => (
                        <div
                          key={i}
                          className="bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-4 flex justify-between items-start"
                        >
                          <div>
                            <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md">
                              {q.type.replace("_", " ")}
                            </span>
                            <p className="text-xs font-black text-zinc-700 dark:text-zinc-200 mt-1">{q.question}</p>
                          </div>
                          <button
                            onClick={() =>
                              updateNote(note.id, {
                                quiz: note.quiz.filter((_, idx) => idx !== i),
                              })
                            }
                            className="text-red-300 hover:text-red-500 ml-4"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      <select
                        value={quizType}
                        onChange={(e) => setQuizType(e.target.value as QuizQuestion["type"])}
                        className={inputCls}
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True / False</option>
                        <option value="identification">Identification</option>
                        <option value="fill_blanks">Fill in the Blanks</option>
                        <option value="matching">Matching</option>
                        <option value="essay">Essay</option>
                      </select>
                      <input
                        className={inputCls}
                        placeholder="Question"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                      />
                      {quizType === "multiple_choice" && (
                        <>
                          {mcChoices.map((c, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input
                                className={`${inputCls} flex-1`}
                                placeholder={`Choice ${i + 1}`}
                                value={c}
                                onChange={(e) => {
                                  const arr = [...mcChoices];
                                  arr[i] = e.target.value;
                                  setMcChoices(arr);
                                }}
                              />
                              <input
                                type="radio"
                                name="correct"
                                checked={mcCorrect === i}
                                onChange={() => setMcCorrect(i)}
                                className="accent-green-600 w-4 h-4"
                              />
                            </div>
                          ))}
                          <p className="text-[10px] text-zinc-400 font-bold">
                            Select the correct answer with the radio button.
                          </p>
                        </>
                      )}
                      {quizType === "true_false" && (
                        <select
                          className={inputCls}
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                        >
                          <option value="">Select Answer</option>
                          <option value="True">True</option>
                          <option value="False">False</option>
                        </select>
                      )}
                      {(quizType === "identification" || quizType === "fill_blanks") && (
                        <input
                          className={inputCls}
                          placeholder="Correct Answer"
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                        />
                      )}
                      {quizType === "matching" && (
                        <>
                          {matchingPairs.map((p, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                className={`${inputCls} flex-1`}
                                placeholder="Prompt"
                                value={p.prompt}
                                onChange={(e) => {
                                  const arr = [...matchingPairs];
                                  arr[i].prompt = e.target.value;
                                  setMatchingPairs(arr);
                                }}
                              />
                              <input
                                className={`${inputCls} flex-1`}
                                placeholder="Match"
                                value={p.match}
                                onChange={(e) => {
                                  const arr = [...matchingPairs];
                                  arr[i].match = e.target.value;
                                  setMatchingPairs(arr);
                                }}
                              />
                            </div>
                          ))}
                          <button
                            onClick={() =>
                              setMatchingPairs([...matchingPairs, { prompt: "", match: "" }])
                            }
                            className="text-xs text-blue-500 font-black text-left"
                          >
                            + Add Pair
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleAddQuestion(note)}
                        className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase"
                      >
                        Add Question
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
              <input
                type="text"
                placeholder="Note Title *"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                className={inputCls}
              />
              <input
                type="text"
                placeholder="Subject"
                value={newNote.subject}
                onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })}
                className={inputCls}
              />
              <textarea
                placeholder="Description (optional)"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <div
                onClick={() => document.getElementById("note-file-input")?.click()}
                className="border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all"
              >
                <Upload className="mx-auto mb-2 text-zinc-300" />
                <p className="text-sm font-bold text-zinc-500">
                  {uploadedFile ? uploadedFile.name : "Click to attach a file (optional)"}
                </p>
                <input
                  id="note-file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])}
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !newNote.title}
                className="bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {uploading ? "Publishing..." : "Publish Note"}
              </button>
            </div>
          </div>
        )}

        {/* ══ SECTIONS TAB ═══════════════════════════════════════════════════════ */}
        {activeTab === "sections" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-10 shadow-sm">

            {/* ── Section List ── */}
            {selectedSectionId === null && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                    Active Sections
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New Section..."
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSection()}
                      className="px-4 py-2 border dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-sm outline-none font-bold"
                    />
                    <button
                      onClick={handleAddSection}
                      className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {/* Import instructions banner */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
                      How to enroll students
                    </p>
                    <p className="text-[11px] text-blue-600 dark:text-blue-300 font-bold leading-relaxed">
                      Click the <Upload className="inline w-3 h-3" /> button on any section card to import a
                      <strong> .csv</strong> or <strong>.xlsx</strong> file containing Student IDs (first column).
                      Students use those IDs to register and are auto-enrolled.
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase hover:bg-blue-700 transition"
                  >
                    <Download size={13} /> Download Template
                  </button>
                </div>

                {/* Import message */}
                {importMsg && (
                  <div
                    className={`mb-6 p-4 rounded-2xl flex items-start gap-3 text-xs font-bold ${
                      importMsg.type === "success"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50"
                        : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50"
                    }`}
                  >
                    {importMsg.type === "success" ? (
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    )}
                    <span>{importMsg.text}</span>
                    <button
                      onClick={() => setImportMsg(null)}
                      className="ml-auto opacity-60 hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Section cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mySections.map((section) => {
                    const totalRoster = studentRosters.filter(
                      (r) => r.sectionId === section.id
                    ).length;
                    const pendingCount = studentRosters.filter(
                      (r) => r.sectionId === section.id && !r.isRegistered
                    ).length;

                    return (
                      <div
                        key={section.id}
                        className="border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 hover:border-green-400 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-xl text-zinc-900 dark:text-white">
                                {section.name}
                              </h4>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                {section.students.length} Enrolled
                                {pendingCount > 0 && (
                                  <span className="ml-1 text-yellow-500">
                                    · {pendingCount} Pending
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleImportClick(section.id)}
                                title="Import Student IDs from CSV/Excel"
                                className="text-zinc-300 hover:text-blue-500 transition"
                              >
                                <Upload size={20} />
                              </button>
                              <button
                                onClick={() => deleteSection(section.id)}
                                title="Delete section"
                                className="text-zinc-300 hover:text-red-500 transition"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>

                          {/* Roster status badge */}
                          <div className="mb-5">
                            {totalRoster > 0 ? (
                              <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                  📋 {totalRoster} ID{totalRoster !== 1 ? "s" : ""} in roster
                                  {pendingCount > 0 && ` · ${pendingCount} not yet registered`}
                                </p>
                              </div>
                            ) : (
                              <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                                <p className="text-[10px] font-black text-zinc-400 italic">
                                  No roster yet — click ↑ to import
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedSectionId(section.id)}
                          className="w-full py-3 bg-white dark:bg-zinc-900 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition shadow-sm"
                        >
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
                  .sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                  );

                const pendingRoster = studentRosters.filter(
                  (r) => r.sectionId === cur.id && !r.isRegistered
                );

                return (
                  <div>
                    <button
                      onClick={() => setSelectedSectionId(null)}
                      className="mb-8 flex items-center gap-2 text-sm text-zinc-400 font-black uppercase hover:text-green-600 transition"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                      <h3 className="text-3xl font-black text-zinc-900 dark:text-white">
                        {cur.name}
                      </h3>
                      <button
                        onClick={() => handleImportClick(cur.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition"
                      >
                        <Upload size={14} /> Import More IDs
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                      {/* Enrolled Students */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                          Enrolled ({cur.students.length})
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm">
                          {cur.students.length === 0 && (
                            <p className="p-6 text-xs text-zinc-300 italic text-center">
                              No students enrolled yet.
                            </p>
                          )}
                          {cur.students.map((st) => (
                            <div
                              key={st.id}
                              className="p-4 flex justify-between items-center text-sm font-bold text-zinc-700 dark:text-zinc-300"
                            >
                              <span>{st.name}</span>
                              <button
                                onClick={() => removeStudentFromSection(cur.id, st.id)}
                                className="text-red-300 hover:text-red-500 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Pending Registration */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                          Pending Registration ({pendingRoster.length})
                        </h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm max-h-80 overflow-y-auto">
                          {pendingRoster.length === 0 && (
                            <p className="p-6 text-xs text-zinc-300 italic text-center">
                              All imported IDs have been registered.
                            </p>
                          )}
                          {pendingRoster.map((entry) => (
                            <div
                              key={entry.studentId}
                              className="p-4 flex justify-between items-center"
                            >
                              <span className="text-xs font-mono font-black text-zinc-600 dark:text-zinc-300">
                                {entry.studentId}
                              </span>
                              <button
                                onClick={() =>
                                  removeRosterEntry(entry.studentId, cur.id)
                                }
                                title="Remove from roster"
                                className="text-red-300 hover:text-red-500 transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Quiz Activity */}
                      <div>
                        <h4 className="font-black mb-4 uppercase text-xs tracking-widest text-zinc-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                          Quiz Activity
                        </h4>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {results.length === 0 && (
                            <p className="text-center py-10 text-zinc-300 italic text-xs">
                              No quiz records yet.
                            </p>
                          )}
                          {results.map((res, i) => (
                            <div
                              key={i}
                              className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-3xl shadow-sm"
                            >
                              <div className="flex justify-between font-black text-sm text-zinc-900 dark:text-white mb-1">
                                <span>{res.studentName}</span>
                                <span className="text-green-600">
                                  {res.score}/{res.total}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase">
                                Quiz: {res.noteTitle}
                              </p>
                              <p className="text-[10px] text-zinc-300 mt-2 border-t dark:border-zinc-800 pt-2">
                                {res.date}
                              </p>
                            </div>
                          ))}
                        </div>
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