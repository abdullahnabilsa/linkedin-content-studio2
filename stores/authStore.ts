import create from 'zustand';

interface AuthState {
  user: any;
  role: string;
  session: any;
  isLoading: boolean;
  isSuperAdmin: boolean;
  setUser: (user: any) => void;
  setSession: (session: any) => void;
  signIn: (credentials: any) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: '',
  session: null,
  isLoading: false,
  isSuperAdmin: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  signIn: async (credentials) => {
    // signIn logic
  },
  signOut: async () => {
    // signOut logic
  }
}));