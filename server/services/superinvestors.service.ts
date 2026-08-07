import {
  loadSuperinvestorById,
  loadSuperinvestorsSnapshot,
  type Superinvestor,
  type SuperinvestorsSnapshot,
} from "@/lib/superinvestors";

export const superinvestorsService = {
  async getSnapshot(minHolders = 3): Promise<SuperinvestorsSnapshot> {
    return loadSuperinvestorsSnapshot(minHolders);
  },

  async getById(id: string): Promise<Superinvestor | null> {
    return loadSuperinvestorById(id);
  },
};
