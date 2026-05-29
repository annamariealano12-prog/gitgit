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

// Teacher pre-creates student credentials; no self-registration for students
export type StudentRoster = {
  studentId: string;     // the assigned student ID (e.g. "2021-00123")
  studentName: string;   // name assigned by the teacher
  password: string;      // password assigned by the teacher
  sectionId: number;     // which section it belongs to
  isRegistered: boolean; // true once the student has logged in for the first time
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
  teacherRegisterStudent: (
    sectionId: number,
    studentId: string,
    studentName: string,
    password: string
  ) => string | null;
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

        // ── Teacher creates a student account directly ──────────────────────
        teacherRegisterStudent: (sectionId, studentId, studentName, password) => {
          const state = get();
          const inputId = normalize(studentId);

          if (!inputId) return "Student ID is required.";
          if (!studentName.trim()) return "Student name is required.";
          if (/\d/.test(studentName)) return "Name cannot contain numbers.";
          if (!/^[a-zA-Z\s]+$/.test(studentName))
            return "Name can only contain letters and spaces.";
          if (!password) return "Password is required.";
          if (password.length > 8) return "Password must not exceed 8 characters.";

          const existingRosterEntry = state.studentRosters.find(
            (r) => normalize(r.studentId) === inputId
          );

          if (existingRosterEntry?.isRegistered)
            return "This student has already logged in. Use password reset to update their credentials.";

          if (existingRosterEntry && existingRosterEntry.sectionId !== sectionId)
            return "This Student ID is already assigned to a different section.";

          // Remove any stale user account so the roster stays authoritative
          const hasStaleUser = state.users.some(
            (u) => normalize(u.userId) === inputId && u.role === "student"
          );

          if (existingRosterEntry) {
            set((state) => ({
              studentRosters: state.studentRosters.map((r) =>
                normalize(r.studentId) === inputId && r.sectionId === sectionId
                  ? { ...r, studentName: studentName.trim(), password }
                  : r
              ),
              // Also purge any stale user entry so loginUser re-reads the roster
              users: hasStaleUser
                ? state.users.filter((u) => normalize(u.userId) !== inputId)
                : state.users,
            }));
          } else {
            set((state) => ({
              studentRosters: [
                ...state.studentRosters,
                { studentId: inputId, studentName: studentName.trim(), password, sectionId, isRegistered: false },
              ],
              users: hasStaleUser
                ? state.users.filter((u) => normalize(u.userId) !== inputId)
                : state.users,
            }));
          }
          return null;
        },

        // ── Bulk-import IDs only (teacher can assign creds later) ───────────
        importStudentIds: (sectionId, studentIds) => {
          const state = get();
          if (!studentIds.length) return "No valid student IDs found in the file.";

          const normalized = studentIds
            .map((id) => normalize(id))
            .filter((id) => id.length > 0);

          if (!normalized.length) return "No valid student IDs found.";

          const existingInSection = new Set(
            state.studentRosters
              .filter((r) => r.sectionId === sectionId)
              .map((r) => r.studentId)
          );
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
              newEntries.push({
                studentId: id,
                studentName: "",
                password: "",
                sectionId,
                isRegistered: false,
              });
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

        // ── Teacher self-registration only ──────────────────────────────────
        registerUser: (user) => {
          const state = get();
          const inputId = normalize(user.userId);

          if (user.role !== "teacher") return "Only teachers can self-register.";
          if (user.password.length > 8) return "Password must not exceed 8 characters.";
          if (!user.name.trim()) return "Name is required.";
          if (/\d/.test(user.name)) return "Name cannot contain numbers.";
          if (!/^[a-zA-Z\s]+$/.test(user.name))
            return "Name can only contain letters and spaces.";
          if (state.users.some((u) => normalize(u.userId) === inputId))
            return "This account is already registered.";

          const newUser: User = {
            ...user,
            userId: inputId,
            id: Date.now(),
          };

          set({ users: [...state.users, newUser], currentUser: newUser });
          return null;
        },

        // ── Login ────────────────────────────────────────────────────────────
        // RULE: if a student ID exists in the roster, the roster is ALWAYS
        // authoritative — even if a stale users entry also exists.
        loginUser: (userId, password) => {
          const state = get();
          const inputId = normalize(userId);

          // ── Student path: check roster FIRST and ALWAYS ──────────────────
          const rosterEntry = state.studentRosters.find(
            (r) => normalize(r.studentId) === inputId
          );

          if (rosterEntry) {
            // Credentials not yet assigned by teacher
            if (!rosterEntry.studentName || !rosterEntry.password)
              return "Your account credentials haven't been set up yet. Please contact your teacher.";

            // Wrong password
            if (rosterEntry.password !== password) return "Incorrect password.";

            // Correct password — check if a user account already exists
            const existingUser = state.users.find(
              (u) => normalize(u.userId) === inputId
            );

            if (existingUser) {
              // Sync the user record from the roster (handles password changes)
              const syncedUser: User = {
                ...existingUser,
                name: rosterEntry.studentName,
                password: rosterEntry.password,
                sectionId: rosterEntry.sectionId,
              };
              const updatedUsers = state.users.map((u) =>
                normalize(u.userId) === inputId ? syncedUser : u
              );
              const updatedRosters = state.studentRosters.map((r) =>
                normalize(r.studentId) === inputId
                  ? { ...r, isRegistered: true }
                  : r
              );
              set({
                users: updatedUsers,
                studentRosters: updatedRosters,
                currentUser: syncedUser,
              });
              return null;
            }

            // First-ever login — create the user account from the roster entry
            const newUser: User = {
              id: Date.now(),
              userId: inputId,
              password,
              role: "student",
              name: rosterEntry.studentName,
              sectionId: rosterEntry.sectionId,
            };

            const updatedSections = state.sections.map((s) =>
              s.id === rosterEntry.sectionId
                ? {
                    ...s,
                    students: [...s.students, { id: newUser.id, name: newUser.name }],
                  }
                : s
            );
            const updatedRosters = state.studentRosters.map((r) =>
              normalize(r.studentId) === inputId
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
          }

          // ── Teacher path: no roster entry found, look up users directly ──
          const existingUser = state.users.find(
            (u) => normalize(u.userId) === inputId
          );
          if (!existingUser) return "Account not found. Please check your credentials.";
          if (existingUser.password !== password) return "Incorrect password.";
          set({ currentUser: existingUser });
          return null;
        },

        // ── Reset Password — syncs BOTH studentRosters and users ────────────
        resetPassword: (identifier, newPass) => {
          const state = get();
          const inputId = normalize(identifier);

          if (!newPass.trim()) return "New password cannot be empty.";
          if (newPass.length > 8) return "New password must not exceed 8 characters.";

          // Student path — roster is authoritative
          const rosterIndex = state.studentRosters.findIndex(
            (r) => normalize(r.studentId) === inputId
          );

          if (rosterIndex !== -1) {
            // Update password in roster
            const updatedRosters = state.studentRosters.map((r) =>
              normalize(r.studentId) === inputId ? { ...r, password: newPass } : r
            );
            // Also sync the users entry if it already exists
            const updatedUsers = state.users.map((u) =>
              normalize(u.userId) === inputId ? { ...u, password: newPass } : u
            );
            set({ studentRosters: updatedRosters, users: updatedUsers });
            return null;
          }

          // Teacher path — users only
          const userIndex = state.users.findIndex(
            (u) => normalize(u.userId) === inputId
          );
          if (userIndex === -1)
            return "Account not found. Please verify your name or Student ID.";

          const updatedUsers = [...state.users];
          updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPass };
          set({ users: updatedUsers });
          return null;
        },

        logoutUser: () => set({ currentUser: null }),
      };
    },
    {
      name: "reviewer-hub-v3",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persistedState: unknown, fromVersion: number) => {
        return persistedState as NoteState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const normalize = (str: string) => str.trim().toUpperCase();

        // Build a set of all student IDs that exist in the roster
        const rosterIds = new Set(
          state.studentRosters.map((r) => normalize(r.studentId))
        );

        // Remove ANY user entry that:
        // 1. Has a matching roster entry (roster is authoritative), AND
        // 2. Is NOT yet registered (isRegistered = false), meaning first login
        //    hasn't happened yet — the user entry is stale/orphaned
        // This forces loginUser to always go through the roster path for students
        // who haven't completed their first login, preventing "Account not found"
        // caused by stale user entries with wrong/empty passwords.
        const unregisteredRosterIds = new Set(
          state.studentRosters
            .filter((r) => !r.isRegistered && r.password)
            .map((r) => normalize(r.studentId))
        );

        const cleaned = state.users.filter((u) => {
          const uid = normalize(u.userId);
          // Keep teachers always
          if (u.role === "teacher") return true;
          // Keep students who have completed first login (isRegistered = true)
          if (rosterIds.has(uid)) {
            const rosterEntry = state.studentRosters.find(
              (r) => normalize(r.studentId) === uid
            );
            // Only keep if actually registered
            return rosterEntry?.isRegistered === true;
          }
          // Keep users with no roster entry (shouldn't happen but be safe)
          return true;
        });

        if (cleaned.length !== state.users.length) {
          state.users = cleaned;
        }

        state.setHydrated();
      },
    }
  )
);