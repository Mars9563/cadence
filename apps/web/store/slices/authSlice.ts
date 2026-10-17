import { StateCreator } from "zustand";
import { ProfileView } from '@cadence/types';

export interface authState{
    user: ProfileView | null;
    isAuthenticated: boolean;

    setUser: (user: ProfileView) => void;
    setIsAuthenticated: (value: boolean) => void;
}

export const CreateAuthSlice: StateCreator<authState> = (set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({
        user: user,
    }),
    setIsAuthenticated: (value) => set({
        isAuthenticated: value,
    }),
})