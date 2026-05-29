import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Flashcard = { question: string; answer: string };
export type QuizQuestion = {
  type: "multiple_choice" | "identification" | "true_false" | "matching" | "fill_blanks" | "essay";
  question: string;
  choices?: string[];
  answer?: string;
  pairs?: { prompt: string; match: string }[];
};
export type QuizResult = {
  studentId: number;
  studentName: string;
  score: number;
  total: number;
  date: string;
};
export type Note = {
  id: number;
  ownerId: number;
  title: string;
  subject: string;
  content?: string;
  fileName?: string;
  fileData?: string;
  fileType?: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  quizResults: QuizResult[];
};
export type Student = { id: number; name: string };
export type Section = { id: number; ownerId: number; name: string; students: Student[] };
export type User = {
  id: number;
  userId: string;
  password: string;
  role: "teacher" | "student";
  name: string;
  sectionId?: number;
};

// Replaces the old AccessCode system
export type StudentRoster = {
  studentId: string;     // the assigned student ID (e.g. "2021-00123")
  sectionId: number;     // which section it belongs to
  isRegistered: boolean; // true once the student creates an account
};

interface NoteState {
  notes: Note[];
  sections: Section[];
  users: User[];
  currentUser: User | null;
  studentRosters: StudentRoster[];
  _hydrated: boolean;

  setHydrated: () => void;
  addNote: (note: Omit<Note, "id" | "quizResults">) => void;
  deleteNote: (id: number) => void;
  updateNote: (id: number, updates: Partial<Note>) => void;
  submitQuizResult: (noteId: number, result: QuizResult) => void;
  addSection: (name: string, ownerId: number) => void;
  deleteSection: (id: number) => void;
  removeStudentFromSection: (sectionId: number, studentId: number) => void;
  importStudentIds: (sectionId: number, studentIds: string[]) => string | null;
  removeRosterEntry: (studentId: string, sectionId: number) => void;
  registerUser: (user: Omit<User, "id">) => string | null;
  loginUser: (userId: string, password: string) => string | null;
  resetPassword: (identifier: string, newPass: string) => string | null;
  logoutUser: () => void;
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => {
      const normalize = (str: string) => str.trim().toUpperCase();

      return {
        notes: [],
        sections: [],
        users: [],
        currentUser: null,
        studentRosters: [],
        _hydrated: false,

        setHydrated: () => set({ _hydrated: true }),

        addNote: (note) =>
          set((state) => ({
            notes: [...state.notes, { ...note, id: Date.now(), quizResults: [] }],
          })),

        deleteNote: (id) =>
          set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),

        updateNote: (id, updates) =>
          set((state) => ({
            notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
          })),

        submitQuizResult: (noteId, result) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? { ...n, quizResults: [...(n.quizResults || []), result] }
                : n
            ),
          })),

        addSection: (name, ownerId) =>
          set((state) => ({
            sections: [
              ...state.sections,
              { id: Date.now(), ownerId, name, students: [] },
            ],
          })),

        deleteSection: (id) =>
          set((state) => ({
            sections: state.sections.filter((s) => s.id !== id),
            // Also clean up roster entries for this section
            studentRosters: state.studentRosters.filter((r) => r.sectionId !== id),
          })),

        removeStudentFromSection: (sectionId, studentId) =>
          set((state) => ({
            sections: state.sections.map((s) =>
              s.id === sectionId
                ? { ...s, students: s.students.filter((st) => st.id !== studentId) }
                : s
            ),
          })),

        importStudentIds: (sectionId, studentIds) => {
          const state = get();
          if (!studentIds.length) return "No valid student IDs found in the file.";

          const normalized = studentIds
            .map((id) => normalize(id))
            .filter((id) => id.length > 0);

          if (!normalized.length) return "No valid student IDs found.";

          // IDs already in this section's roster
          const existingInSection = new Set(
            state.studentRosters
              .filter((r) => r.sectionId === sectionId)
              .map((r) => r.studentId)
          );

          // IDs already assigned to a DIFFERENT section
          const existingOtherSection = new Set(
            state.studentRosters
              .filter((r) => r.sectionId !== sectionId)
              .map((r) => r.studentId)
          );

          const newEntries: StudentRoster[] = [];
          const skippedDuplicate: string[] = [];
          const skippedOther: string[] = [];

          for (const id of normalized) {
            if (existingInSection.has(id)) {
              skippedDuplicate.push(id);
            } else if (existingOtherSection.has(id)) {
              skippedOther.push(id);
            } else {
              newEntries.push({ studentId: id, sectionId, isRegistered: false });
            }
          }

          if (!newEntries.length) {
            return `All IDs already exist. (${skippedDuplicate.length} duplicates, ${skippedOther.length} in other sections)`;
          }

          set((state) => ({
            studentRosters: [...state.studentRosters, ...newEntries],
          }));
          return null;
        },

        removeRosterEntry: (studentId, sectionId) =>
          set((state) => ({
            studentRosters: state.studentRosters.filter(
              (r) => !(r.studentId === studentId && r.sectionId === sectionId)
            ),
          })),

        registerUser: (user) => {
          const state = get();
          const inputId = normalize(user.userId);

          if (user.password.length > 8) return "Password must not exceed 8 characters.";
          if (!user.name.trim()) return "Name is required.";
          if (/\d/.test(user.name)) return "Name cannot contain numbers.";
          if (!/^[a-zA-Z\s]+$/.test(user.name))
            return "Name can only contain letters and spaces.";
          if (state.users.some((u) => normalize(u.userId) === inputId))
            return "This account is already registered.";

          let targetSectionId: number | undefined = undefined;

          if (user.role === "student") {
            // Find an unregistered roster entry matching this student ID
            const rosterEntry = state.studentRosters.find(
              (r) => !r.isRegistered && normalize(r.studentId) === inputId
            );
            if (!rosterEntry)
              return "INVALID STUDENT ID. Please contact your teacher.";
            targetSectionId = rosterEntry.sectionId;
          }

          const newUser: User = {
            ...user,
            userId: inputId,
            id: Date.now(),
            sectionId: targetSectionId,
          };

          const updatedSections = state.sections.map((s) =>
            s.id === targetSectionId
              ? {
                  ...s,
                  students: [...s.students, { id: newUser.id, name: newUser.name }],
                }
              : s
          );

          // Mark the roster entry as registered
          const updatedRosters = state.studentRosters.map((r) =>
            normalize(r.studentId) === inputId && r.sectionId === targetSectionId
              ? { ...r, isRegistered: true }
              : r
          );

          set({
            users: [...state.users, newUser],
            sections: updatedSections,
            studentRosters: updatedRosters,
            currentUser: newUser,
          });
          return null;
        },

        loginUser: (userId, password) => {
          const state = get();
          const inputId = normalize(userId);
          const user = state.users.find((u) => normalize(u.userId) === inputId);
          if (!user) return "Account not found. Please check your credentials.";
          if (user.password !== password) return "Incorrect password.";
          set({ currentUser: user });
          return null;
        },

        resetPassword: (identifier, newPass) => {
          const state = get();
          const inputId = normalize(identifier);
          const userIndex = state.users.findIndex(
            (u) => normalize(u.userId) === inputId
          );
          if (userIndex === -1)
            return "Account not found. Please verify your name or Student ID.";
          if (!newPass.trim()) return "New password cannot be empty.";
          if (newPass.length > 8)
            return "New password must not exceed 8 characters.";

          const updatedUsers = [...state.users];
          updatedUsers[userIndex] = {
            ...updatedUsers[userIndex],
            password: newPass,
          };
          set({ users: updatedUsers });
          return null;
        },

        logoutUser: () => set({ currentUser: null }),
      };
    },
    {
      name: "reviewer-hub-v2",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);