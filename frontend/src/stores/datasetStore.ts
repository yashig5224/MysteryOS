import { create } from "zustand";

type State = {
  selectedDatasetId: string | null;
  setSelectedDataset: (id: string | null) => void;
};

export const useDatasetStore = create<State>((set) => ({
  selectedDatasetId: null,
  setSelectedDataset: (id) => set({ selectedDatasetId: id }),
}));
