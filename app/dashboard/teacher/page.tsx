"use client";

import { useState, useEffect } from "react";
import { 
  FileText, Users, Trash2, Plus, ArrowLeft, Award, Clock, 
  CheckCircle2, BookOpen, Upload, ClipboardList, Download,
  BookMarked, ChevronDown, ChevronUp, X, Fingerprint, Copy
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useNoteStore, type Note, type Section, type Student, type QuizQuestion } from "../../lib/noteStore";
import Navbar from "../../components/Navbar";

export default function TeacherDashboard() {
  const router = useRouter();
  const { 
    notes, addNote, deleteNote, updateNote,
    sections, addSection, deleteSection, removeStudentFromSection,
    generateAccessCode, accessCodes, // AS REQUIRED
    currentUser 
  } = useNoteStore();

  const [activeTab, setActiveTab] = useState<"notes" | "upload" | "sections">("notes");
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  
  const [expandedNoteId, setExpandedNoteId] = useState<{ type: 'flash' | 'quiz' | null, id: number | null }>({ type: null, id: null });
  const [quizType, setQuizType] = useState<QuizQuestion["type"]>("multiple_choice");
  const [newQuestion, setNewQuestion] = useState("");
  const [mcChoices, setMcChoices] = useState(["", "", "", ""]);
  const [mcCorrect, setMcCorrect] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [matchingPairs, setMatchingPairs] = useState([{ prompt: "", match: "" }]);
  const [newFlash, setNewFlash] = useState({ question: "", answer: "" });

  const [newSectionName, setNewSectionName] = useState("");
  const [newNote, setNewNote] = useState({ title: "", subject: "", content: "" });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "teacher") router.push("/");
  }, [currentUser, router]);

  if (!currentUser) return null;

  const handleAddQuestion = (note: Note) => {
    let questionObj: QuizQuestion = { type: quizType, question: newQuestion };
    if (quizType === "multiple_choice") { questionObj.choices = mcChoices; questionObj.answer = mcChoices[mcCorrect]; }
    else if (quizType === "matching") { questionObj.pairs = matchingPairs; }
    else { questionObj.answer = textAnswer; }

    updateNote(note.id, { quiz: [...note.quiz, questionObj] });
    setNewQuestion(""); setTextAnswer(""); setMcChoices(["","","",""]); setMatchingPairs([{ prompt: "", match: "" }]);
  };

  const handleAddFlashcard = (note: Note) => {
    if (!newFlash.question || !newFlash.answer) return;
    updateNote(note.id, { flashcards: [...note.flashcards, { ...newFlash }] });
    setNewFlash({ question: "", answer: "" });
  };

  const handleAddSection = () => { if (newSectionName.trim()) { addSection(newSectionName.trim()); setNewSectionName(""); } };

  const downloadReport = (sectionName: string, data: any[]) => {
    if (data.length === 0) return alert("No quiz data.");
    const headers = ["Student Name", "Quiz Title", "Score", "Total", "Date"];
    const rows = data.map(r => [`"${r.studentName}"`,`"${r.noteTitle}"`,r.score,r.total,`"${r.date}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `${sectionName}_Report.csv`); link.click();
  };

  async function handleUpload() {
    if (!newNote.title) return;
    setUploading(true);
    let fileName: string | undefined; let fileData: string | undefined; let fileType: string | undefined;
    if (uploadedFile) {
      fileName = uploadedFile.name; fileType = uploadedFile.type;
      fileData = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(uploadedFile); });
    }
    setTimeout(() => {
      addNote({ ...newNote, fileName, fileData, fileType, flashcards: [], quiz: [] });
      setNewNote({ title: "", subject: "", content: "" }); setUploadedFile(null); setUploading(false); setSuccess(true);
      setTimeout(() => { setSuccess(false); setActiveTab("notes"); }, 1500);
    }, 800);
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      <Navbar showLogout={true} />
      <main className="flex-grow p-8 max-w-6xl mx-auto w-full">
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">Welcome, {currentUser.name} 👋</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-bold mt-1 text-sm uppercase tracking-wide">Teacher Dashboard & Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 shadow-sm"><FileText className="text-green-700" /><div><div className="text-2xl font-black text-zinc-900 dark:text-white">{notes.length}</div><div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Notes</div></div></div>
          <div onClick={() => setActiveTab("sections")} className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 shadow-sm cursor-pointer hover:border-green-500 transition"><Users className="text-green-700" /><div><div className="text-2xl font-black text-zinc-900 dark:text-white">{sections.length}</div><div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Sections</div></div></div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800 p-6 flex items-center gap-4 shadow-sm"><BookOpen className="text-green-700" /><div><div className="text-2xl font-black text-zinc-900 dark:text-white">{[...new Set(notes.map(n => n.subject).filter(Boolean))].length}</div><div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Subjects</div></div></div>
        </div>

        <div className="flex gap-2 mb-8 border-b dark:border-zinc-800 pb-4">
          <button onClick={() => setActiveTab("notes")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === "notes" ? "bg-green-600 text-white shadow-lg" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border dark:border-zinc-800"}`}>My Notes</button>
          <button onClick={() => setActiveTab("upload")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === "upload" ? "bg-green-600 text-white shadow-lg" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border dark:border-zinc-800"}`}>+ Upload Note</button>
          <button onClick={() => { setActiveTab("sections"); setSelectedSectionId(null); }} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition ${activeTab === "sections" ? "bg-green-600 text-white shadow-lg" : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border dark:border-zinc-800"}`}>Sections & Students</button>
        </div>

        {/* --- TAB CONTENT --- */}
        {activeTab === "notes" && (
          <div className="grid grid-cols-1 gap-6">
            {notes.map((note: Note) => (
              <div key={note.id} className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-8 shadow-sm">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-black uppercase px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg">{note.subject || "General"}</span>
                  <button onClick={() => deleteNote(note.id)} className="text-red-300 hover:text-red-500 transition"><Trash2 size={20}/></button>
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">{note.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{note.content}</p>

                {note.fileName && (
                  <div className="inline-flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 px-3 py-2 rounded-xl mb-6">
                    <FileText size={14} className="text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{note.fileName}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button 
                    onClick={() => setExpandedNoteId(expandedNoteId.id === note.id && expandedNoteId.type === 'flash' ? {type: null, id: null} : {type: 'flash', id: note.id})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition ${expandedNoteId.id === note.id && expandedNoteId.type === 'flash' ? 'bg-purple-600 text-white' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'}`}
                  >
                    <BookMarked size={16}/> Manage Flashcards ({note.flashcards.length}) <ChevronDown size={14}/>
                  </button>
                  <button 
                    onClick={() => setExpandedNoteId(expandedNoteId.id === note.id && expandedNoteId.type === 'quiz' ? {type: null, id: null} : {type: 'quiz', id: note.id})}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition ${expandedNoteId.id === note.id && expandedNoteId.type === 'quiz' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}
                  >
                    <ClipboardList size={16}/> Manage Quiz ({note.quiz.length}) <ChevronDown size={14}/>
                  </button>
                </div>

                {expandedNoteId.id === note.id && (
                  <div className="mt-6 pt-6 border-t dark:border-zinc-800 animate-in slide-in-from-top-2">
                    {expandedNoteId.type === 'flash' ? (
                      <div className="bg-purple-50 dark:bg-zinc-800/50 p-6 rounded-2xl border dark:border-purple-900/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <input type="text" placeholder="Question" value={newFlash.question} onChange={(e) => setNewFlash({...newFlash, question: e.target.value})} className="p-3 rounded-xl border-none text-sm outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                          <input type="text" placeholder="Answer" value={newFlash.answer} onChange={(e) => setNewFlash({...newFlash, answer: e.target.value})} className="p-3 rounded-xl border-none text-sm outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                        </div>
                        <button onClick={() => handleAddFlashcard(note)} className="bg-purple-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase">Add Flashcard</button>
                        <div className="mt-4 space-y-2">
                          {note.flashcards.map((f, i) => (
                            <div key={i} className="flex justify-between bg-white dark:bg-zinc-800 p-3 rounded-xl text-xs shadow-sm border dark:border-zinc-700">
                              <span className="text-zinc-900 dark:text-white"><span className="font-bold text-purple-600">Q:</span> {f.question} | <span className="font-bold text-purple-600">A:</span> {f.answer}</span>
                              <button onClick={() => updateNote(note.id, { flashcards: note.flashcards.filter((_, idx) => idx !== i)})} className="text-red-400"><X size={14}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 dark:bg-zinc-800/50 p-6 rounded-2xl border dark:border-blue-900/30">
                        <div className="flex justify-between mb-4">
                          <select value={quizType} onChange={(e) => setQuizType(e.target.value as any)} className="text-xs p-2 rounded-lg font-bold bg-white dark:bg-zinc-700 text-blue-700 dark:text-blue-300 outline-none border dark:border-zinc-600">
                            <option value="multiple_choice">Multiple Choice</option><option value="identification">Identification</option>
                            <option value="true_false">True / False</option><option value="matching">Matching Type</option>
                            <option value="fill_blanks">Fill in the Blanks</option><option value="essay">Essay</option>
                          </select>
                        </div>
                        <textarea placeholder="Question Text..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} className="w-full p-4 rounded-xl border-none text-sm mb-4 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                        {quizType === "multiple_choice" && (
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {mcChoices.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2 rounded-xl shadow-sm">
                                <input type="radio" checked={mcCorrect === i} onChange={() => setMcCorrect(i)} className="accent-blue-600" />
                                <input type="text" placeholder={`Option ${i+1}`} value={c} onChange={(e) => { const n = [...mcChoices]; n[i] = e.target.value; setMcChoices(n); }} className="w-full bg-transparent outline-none text-xs text-zinc-900 dark:text-white" />
                              </div>
                            ))}
                          </div>
                        )}
                        {quizType === "matching" && (
                          <div className="space-y-2 mb-4">
                            {matchingPairs.map((p, i) => (
                              <div key={i} className="flex gap-2">
                                <input type="text" placeholder="Prompt" value={p.prompt} onChange={(e) => { const n = [...matchingPairs]; n[i].prompt = e.target.value; setMatchingPairs(n); }} className="flex-1 p-3 rounded-xl border-none text-sm outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                                <input type="text" placeholder="Match" value={p.match} onChange={(e) => { const n = [...matchingPairs]; n[i].match = e.target.value; setMatchingPairs(n); }} className="flex-1 p-3 rounded-xl border-none text-sm outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                              </div>
                            ))}
                            <button onClick={() => setMatchingPairs([...matchingPairs, {prompt: "", match: ""}])} className="text-[10px] font-bold text-blue-600">+ Add Pair</button>
                          </div>
                        )}
                        {(quizType !== "multiple_choice" && quizType !== "matching" && quizType !== "essay") && (
                          <input type="text" placeholder="Correct Answer" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} className="w-full p-3 rounded-xl border-none text-sm mb-4 outline-none bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" />
                        )}
                        <button onClick={() => handleAddQuestion(note)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase">Save Question</button>
                        <div className="mt-4 space-y-2">
                          {note.quiz.map((q, i) => (
                            <div key={i} className="flex justify-between bg-white dark:bg-zinc-800 p-3 rounded-xl text-xs shadow-sm border dark:border-zinc-700">
                              <span className="text-zinc-900 dark:text-white"><span className="font-bold text-blue-600">{i+1}. [{q.type.replace('_',' ')}]</span> {q.question}</span>
                              <button onClick={() => updateNote(note.id, { quiz: note.quiz.filter((_, idx) => idx !== i)})} className="text-red-400"><X size={14}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-10 shadow-sm max-w-xl mx-auto">
            <h3 className="text-2xl font-black mb-8 text-zinc-900 dark:text-white text-center uppercase tracking-tight">Upload New Note</h3>
            {success && (
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-2xl text-sm font-bold flex items-center gap-2 animate-bounce">
                <CheckCircle2 size={20} /> Published Successfully!
              </div>
            )}
            <div className="flex flex-col gap-6">
              <input type="text" placeholder="Note Title" value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-green-500" />
              <input type="text" placeholder="Subject" value={newNote.subject} onChange={(e) => setNewNote({ ...newNote, subject: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl outline-none focus:ring-2 focus:ring-green-500" />
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) setUploadedFile(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${dragOver ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"}`}
              >
                <Upload className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">{uploadedFile ? uploadedFile.name : "Drag & drop a file here, or browse"}</p>
                <input id="file-input" type="file" className="hidden" onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])} />
              </div>
              <textarea rows={4} placeholder="Content Summary..." value={newNote.content} onChange={(e) => setNewNote({ ...newNote, content: e.target.value })} className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800 border dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl outline-none resize-none focus:ring-2 focus:ring-green-500" />
              <button onClick={handleUpload} disabled={uploading || !newNote.title} className="bg-green-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-lg hover:bg-green-700 transition-all">{uploading ? "Publishing..." : "Publish Note"}</button>
            </div>
          </div>
        )}

        {/* --- SECTIONS TAB --- */}
        {activeTab === "sections" && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 p-10 shadow-sm animate-in fade-in zoom-in-95">
            {selectedSectionId === null ? (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Active Sections</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="New Section..." value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} className="px-4 py-2 border dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                    <button onClick={handleAddSection} className="bg-green-600 text-white p-2 rounded-xl hover:bg-green-700 transition"><Plus size={20}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sections.map((section: Section) => {
                    // LOGIC: Find the last unused code for this section to display on the card
                    const lastCode = accessCodes.filter(c => c.sectionId === section.id && !c.isUsed).pop();

                    return (
                      <div key={section.id} className="border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 hover:border-green-400 transition flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-black text-xl text-zinc-900 dark:text-white">{section.name}</h4>
                              <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{section.students.length} Students</p>
                            </div>
                            
                            <div className="flex gap-2">
                              {/* USER ID GENERATOR BUTTON */}
                              <button 
                                title="Generate unique User ID for this section"
                                onClick={() => {
                                  const id = generateAccessCode(section.id);
                                  alert(`New Student ID Generated: ${id}\nShare this with a student to automatically enroll them in ${section.name}.`);
                                }}
                                className="text-zinc-300 dark:text-zinc-600 hover:text-blue-500 transition"
                              >
                                <Fingerprint size={20}/>
                              </button>
                              <button onClick={() => deleteSection(section.id)} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition"><Trash2 size={20}/></button>
                            </div>
                          </div>

                          {/* DISPLAY AREA FOR GENERATED ID */}
                          <div className="mb-6 h-10 flex items-center">
                            {lastCode ? (
                              <div className="w-full flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 animate-in fade-in zoom-in-95">
                                <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 tracking-tighter">ID: {lastCode.id}</span>
                                <button 
                                  onClick={() => {navigator.clipboard.writeText(lastCode.id); alert("Student ID Copied!");}} 
                                  className="text-zinc-300 hover:text-green-500 transition"
                                >
                                  <Copy size={12}/>
                                </button>
                              </div>
                            ) : (
                              <p className="text-[9px] font-bold text-zinc-400 uppercase italic pl-1">No ID Generated</p>
                            )}
                          </div>
                        </div>

                        <button onClick={() => setSelectedSectionId(section.id)} className="w-full py-3 bg-white dark:bg-zinc-900 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition shadow-sm">View Dashboard</button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              (() => {
                const cur = sections.find(s => s.id === selectedSectionId); if (!cur) return null;
                const sIds = new Set(cur.students.map(st => st.id));
                const results = notes.flatMap(n => (n.quizResults || []).filter(r => sIds.has(r.studentId)).map(r => ({ ...r, noteTitle: n.title }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return (
                  <div>
                    <div className="flex justify-between items-center mb-8 border-b dark:border-zinc-800 pb-6">
                      <button onClick={() => setSelectedSectionId(null)} className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 font-black uppercase hover:text-green-600 transition"><ArrowLeft size={16}/> Back</button>
                      <button onClick={() => downloadReport(cur.name, results)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-green-700 transition"><Download size={16} /> Download CSV</button>
                    </div>
                    <h3 className="text-3xl font-black mb-10 text-zinc-900 dark:text-white">{cur.name} Overview</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      <div className="lg:col-span-1">
                        <h4 className="font-black mb-6 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-widest"><Users size={18}/> Roster</h4>
                        <div className="bg-white dark:bg-zinc-900 rounded-3xl border dark:border-zinc-800 divide-y dark:divide-zinc-800 overflow-hidden shadow-sm">
                          {cur.students.map((st: Student) => (
                            <div key={st.id} className="p-4 flex justify-between bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                              <span>{st.name}</span>
                              <button onClick={() => removeStudentFromSection(cur.id, st.id)} className="text-red-300 dark:text-red-900 hover:text-red-500 transition"><Trash2 size={16}/></button>
                            </div>
                          ))}
                          {cur.students.length === 0 && <p className="p-10 text-center text-xs text-zinc-400 dark:text-zinc-600 italic">Empty roster.</p>}
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <h4 className="font-black mb-6 flex items-center gap-2 text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-widest"><Award size={18} className="text-yellow-500"/> Quiz Submissions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {results.map((res, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-5 rounded-3xl shadow-sm hover:border-green-400 transition">
                              <div className="flex justify-between items-start mb-3">
                                <span className="font-black text-sm text-zinc-900 dark:text-white">{res.studentName}</span>
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${res.score >= res.total/2 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>{res.score} / {res.total}</span>
                              </div>
                              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter mb-4">Quiz: <span className="text-zinc-700 dark:text-zinc-300">{res.noteTitle}</span></p>
                              <div className="text-[10px] text-zinc-300 dark:text-zinc-600 flex items-center gap-1 border-t dark:border-zinc-800 pt-3"><Clock size={12}/> {res.date}</div>
                            </div>
                          ))}
                          {results.length === 0 && <div className="col-span-2 py-20 text-center text-zinc-300 dark:text-zinc-700 italic border-2 border-dashed dark:border-zinc-800 rounded-3xl">No records found.</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </main>
    </div>
  );
}