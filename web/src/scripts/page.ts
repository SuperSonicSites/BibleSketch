// Page-wide behaviours for plain server-rendered markup (no React needed):
//   data-open-auth="login|signup"  opens the auth modal
//   data-guest-only                hidden once someone is signed in
//   data-copy="<url>"              copies the URL, then shows "Copied!" in its <span>
import { $user, openModal, type AuthView } from '../lib/store.ts';

document.addEventListener('click', async (e) => {
  const target = e.target as Element;
  const auth = target.closest<HTMLElement>('[data-open-auth]');
  if (auth) {
    auth.closest('details')?.removeAttribute('open');
    openModal({ name: 'auth', view: auth.dataset.openAuth as AuthView });
    return;
  }
  const copy = target.closest<HTMLElement>('[data-copy]');
  if (copy) {
    const label = copy.querySelector('span');
    const before = label?.textContent;
    await navigator.clipboard.writeText(copy.dataset.copy!);
    if (label) {
      label.textContent = 'Copied!';
      setTimeout(() => (label.textContent = before ?? ''), 2000);
    }
  }
});

$user.subscribe((u) => document.querySelectorAll<HTMLElement>('[data-guest-only]').forEach((n) => (n.hidden = Boolean(u))));
