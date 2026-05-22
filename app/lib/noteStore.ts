import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Flashcard = { question: string; answer: string };
export type QuizQuestion = { 
  type: "multiple_choice" | "identification" | "true_false" | "matching" | "fill_blanks" | "essay"; 
  question: string; choices?: string[]; answer?: string; pairs?: { prompt: string; match: string }[];
};
export type QuizResult = { studentId: number; studentName: string; score: number; total: number; date: string };
export type Note = { id: number; title: string; subject: string; content?: string; fileName?: string; fileData?: string; fileType?: string; flashcards: Flashcard[]; quiz: QuizQuestion[]; quizResults: QuizResult[]; };
export type Student = { id: number; name: string };
export type Section = { id: number; name: string; students: Student[] };
export type User = { id: number; userId: string; password: string; role: "teacher" | "student"; name: string; sectionId?: number };

// NEW: Type for generated student IDs
export type AccessCode = { id: string; sectionId: number; isUsed: boolean };

interface NoteState {
  notes: Note[]; sections: Section[]; users: User[]; currentUser: User | null;
  accessCodes: AccessCode[]; // Added
  addNote: (note: Omit<Note, "id" | "quizResults">) => void;
  deleteNote: (id: number) => void;
  updateNote: (id: number, updates: Partial<Note>) => void;
  submitQuizResult: (noteId: number, result: QuizResult) => void;
  addSection: (name: string) => void;
  deleteSection: (id: number) => void;
  addStudentToSection: (sectionId: number, student: Student) => void;
  removeStudentFromSection: (sectionId: number, studentId: number) => void;
  generateAccessCode: (sectionId: number) => string; // Added
  registerUser: (user: Omit<User, "id">) => string | null;
  loginUser: (userId: string, password: string) => string | null;
  logoutUser: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],
      sections: [
        { id: 1, name: "BSIT 3A", students: [] },
        { id: 2, name: "CPE 2B", students: [] }
      ],
      users: [],
      currentUser: null,
      accessCodes: [],

      addNote: (note) => set((state) => ({ notes: [...state.notes, { ...note, id: Date.now(), quizResults: [] }] })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n: Note) => n.id !== id) })),
      updateNote: (id, updates) => set((state) => ({ notes: state.notes.map((n: Note) => (n.id === id ? { ...n, ...updates } : n)) })),
      submitQuizResult: (noteId, result) => set((state) => ({
        notes: state.notes.map((n: Note) => n.id === noteId ? { ...n, quizResults: [...(n.quizResults || []), result] } : n)
      })),
      addSection: (name) => set((state) => ({ sections: [...state.sections, { id: Date.now(), name, students: [] }] })),
      deleteSection: (id) => set((state) => ({ sections: state.sections.filter((s: Section) => s.id !== id) })),
      
      addStudentToSection: (sectionId, student) => set((state) => ({
        sections: state.sections.map((s: Section) => {
          const filteredStudents = s.students.filter((st: Student) => st.id !== student.id);
          if (s.id === sectionId) return { ...s, students: [...filteredStudents, student] };
          return { ...s, students: filteredStudents };
        }),
        currentUser: state.currentUser && state.currentUser.id === student.id ? { ...state.currentUser, sectionId } : state.currentUser,
        users: state.users.map((u: User) => u.id === student.id ? { ...u, sectionId } : u)
      })),

      removeStudentFromSection: (sectionId, studentId) => set((state) => ({
        sections: state.sections.map((s: Section) => s.id === sectionId ? { ...s, students: s.students.filter((st: Student) => st.id !== studentId) } : s)
      })),

      generateAccessCode: (sectionId) => {
        const newId = `STU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        set((state) => ({ accessCodes: [...state.accessCodes, { id: newId, sectionId, isUsed: false }] }));
        return newId;
      },

      registerUser: (user) => {
        const state = get();
        if (state.users.some((u: User) => u.userId.toLowerCase() === user.userId.toLowerCase())) return "User ID taken.";
        if (state.users.some((u: User) => u.name.toLowerCase().trim() === user.name.toLowerCase().trim())) return "Name already exists.";
        
        // CHECK IF USER ID IS A GENERATED CODE
        const matchingCode = state.accessCodes.find(c => c.id === user.userId && !c.isUsed);
        let finalSectionId = user.sectionId;
        if (matchingCode) finalSectionId = matchingCode.sectionId;

        const newUser: User = { ...user, id: Date.now(), sectionId: finalSectionId };
        let updatedSections = state.sections;

        if (newUser.role === "student" && finalSectionId) {
          updatedSections = state.sections.map((s: Section) => 
            s.id === finalSectionId ? { ...s, students: [...s.students, { id: newUser.id, name: newUser.name }] } : s
          );
        }

        const updatedCodes = state.accessCodes.map(c => c.id === user.userId ? { ...c, isUsed: true } : c);

        set({ users: [...state.users, newUser], sections: updatedSections, accessCodes: updatedCodes, currentUser: newUser });
        return null;
      },

      loginUser: (userId, password) => {
        const user = get().users.find((u: User) => u.userId.toLowerCase() === userId.toLowerCase());
        if (!user) return "User ID not found.";
        if (user.password !== password) return "Incorrect password.";
        set({ currentUser: user });
        return null;
      },
      logoutUser: () => set({ currentUser: null }),
    }),
    { name: "reviewer-hub-vfinal" }
  )
);