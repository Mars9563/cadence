import { StateCreator } from "zustand";
import { Profile } from '@cadence/types';

export interface authState{
    user: Profile | null;
    isAuthenticated: boolean;

    setUser: (user: Profile) => void;
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