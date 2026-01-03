import { create } from 'zustand';

interface UIState {
  // Drawer state
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;

  // Compose box state
  isComposeOpen: boolean;
  composeContent: string;
  openCompose: () => void;
  openComposeWithContent: (content: string) => void;
  closeCompose: () => void;
  clearComposeContent: () => void;

  // Invite modal state
  isInviteModalOpen: boolean;
  openInviteModal: () => void;
  closeInviteModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Drawer
  isDrawerOpen: false,
  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

  // Compose box
  isComposeOpen: false,
  composeContent: '',
  openCompose: () => set({ isComposeOpen: true }),
  openComposeWithContent: (content: string) =>
    set({
      isComposeOpen: true,
      composeContent: content,
    }),
  closeCompose: () => set({ isComposeOpen: false }),
  clearComposeContent: () => set({ composeContent: '' }),

  // Invite modal
  isInviteModalOpen: false,
  openInviteModal: () => set({ isInviteModalOpen: true }),
  closeInviteModal: () => set({ isInviteModalOpen: false }),
}));
