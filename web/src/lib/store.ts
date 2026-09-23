// Shared client state for every island (header controls, modal host, page actions). nanostores atoms are
// module singletons, so all islands on a page see the same values.
import { atom } from 'nanostores';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// users/{uid} (the fields the UI reads).
export interface Profile {
  displayName?: string;
  photoURL?: string;
  photoFileName?: string;
  credits?: number;
  downloadsRemaining?: number;
  isPremium?: boolean;
  blessedSketchIds?: string[];
  profileComplete?: boolean;
}

export type AuthView = 'login' | 'signup' | 'forgot_password' | 'reset_sent' | 'verification_sent';

export type Modal =
  | { name: 'auth'; view: AuthView }
  | { name: 'account' }
  | { name: 'completion' }
  | { name: 'error'; title: string; message: string; link?: { href: string; label: string } }
  | { name: 'premium'; remaining: number }
  | null;

// false until Firebase Auth has restored (or ruled out) a session: islands render the guest state until then.
export const $authReady = atom(false);
export const $user = atom<AuthUser | null>(null);
// null = not loaded yet (or signed out); set from the live users/{uid} listener.
export const $profile = atom<Profile | null>(null);
export const $modal = atom<Modal>(null);

export const openModal = (m: Modal) => $modal.set(m);
// The visitor dismissed the modal: a gated action waiting for sign-in is dropped with it.
export const cancelModal = () => {
  $modal.set(null);
  pending = null;
};
// The modal finished its job (e.g. signed in): the gated action still runs once the profile loads.
export const doneModal = () => $modal.set(null);

let pending: (() => void) | null = null;

// Run `action` once someone is signed in with a loaded profile; otherwise open the auth modal and run it after
// sign-in. The action must read $user/$profile when it runs (not values captured at click time).
export function requireAuth(action: () => void, view: AuthView = 'login') {
  if ($user.get() && $profile.get()) return action();
  pending = action;
  $modal.set({ name: 'auth', view });
}

$profile.subscribe((p) => {
  if (p && $user.get() && pending) {
    const run = pending;
    pending = null;
    run();
  }
});
