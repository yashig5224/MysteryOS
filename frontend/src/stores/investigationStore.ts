import { create } from "zustand";

type State = {
  activeInvestigationId: string | null;
  setActiveInvestigation: (id: string | null) => void;
};

export const useInvestigationStore = create<State>((set) => ({
  activeInvestigationId: null,
  setActiveInvestigation: (id) => set({ activeInvestigationId: id }),
}));
