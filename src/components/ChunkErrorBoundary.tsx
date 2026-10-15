import { Component, type ReactNode } from 'react';

const CHUNK_ERR = /dynamically imported module|Failed to fetch|Loading chunk|Importing a module script failed|error loading dynamically/i;
const KEY = 'chunk-reload-at';

interface State { failed: boolean }

/**
 * Last safety net: after a site update, a page left open can ask for a file that no longer exists.
 * Instead of a blank page, reload once to fetch the new version, or show a clear message.
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  declare state: State;
  declare props: { children: ReactNode };

  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const msg = String((error as any)?.message || error || '');
    if (!CHUNK_ERR.test(msg)) return;
    let last = 0;
    try { last = Number(sessionStorage.getItem(KEY) || 0); } catch { /* ignoré */ }
    if (Date.now() - last > 30_000) {
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* ignoré */ }
      window.location.reload();
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-[#FFF7E6] p-6 text-center text-[#0B0F1F]">
        <div className="max-w-md space-y-4 rounded-3xl border-[3px] border-[#0B0F1F] bg-white p-8 shadow-[6px_6px_0_#0B0F1F]">
          <p className="text-xl font-black">Le site vient d'être mis à jour</p>
          <p className="font-medium">Rechargez la page pour continuer. Vos informations saisies sont conservées.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-2xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-6 py-3 font-black shadow-[4px_4px_0_#0B0F1F]">
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
