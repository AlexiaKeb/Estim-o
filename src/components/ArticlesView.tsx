import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, ImagePlus, List, Loader2, Pencil, Plus, Trash2, Type, Heading2, X, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { ArticleBlock, BlogPost } from '../data/blog';
import { BlogArticle } from './BlogPages';

interface Row {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  status: 'brouillon' | 'publie';
  cover_url: string | null;
  published_at: string | null;
  updated_at: string;
}

interface Draft {
  id?: string;
  slug?: string;
  status: 'brouillon' | 'publie';
  title: string;
  category: string;
  coverUrl: string;
  intro: string;
  blocks: ArticleBlock[];
  metaTitle: string;
  description: string;
  published_at?: string | null;
}

const EMPTY: Draft = { status: 'brouillon', title: '', category: 'Conseils', coverUrl: '', intro: '', blocks: [], metaTitle: '', description: '' };
const CATEGORIES = ['Conseils', 'Estimation', 'Marché', 'Préparer sa vente', 'Vendre', 'Quartiers'];
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Reduces a photo before sending it (max 1600 px, JPEG): fast upload and fast pages for visitors. */
async function shrinkImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image illisible');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', 0.85));
}

async function uploadPhoto(file: File): Promise<string> {
  const blob = await shrinkImage(file);
  const res = await fetch('/api/articles/image', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "L'envoi de la photo a échoué.");
  return data.url as string;
}

const input = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900';
const label = 'block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5';

const PhotoPicker: React.FC<{ url: string; onChange: (url: string) => void; onError: (m: string) => void; title: string }> = ({ url, onChange, onError, title }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadPhoto(f));
    } catch (e: any) {
      onError(e.message || "L'envoi de la photo a échoué.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };
  return (
    <div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="w-28 h-20 object-cover rounded-lg border border-stone-200" /> : <div className="w-28 h-20 rounded-lg border border-dashed border-stone-300 bg-stone-50 flex items-center justify-center text-stone-400"><ImagePlus className="w-5 h-5" /></div>}
      <div className="flex flex-col gap-1.5">
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={title} onChange={(e) => pick(e.target.files?.[0])} />
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-800 disabled:opacity-60">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {url ? 'Changer la photo' : 'Choisir une photo'}
        </button>
        {url && <button type="button" onClick={() => onChange('')} className="text-xs text-rose-700 underline text-left">Retirer</button>}
      </div>
    </div>
  );
};

export const ArticlesView: React.FC = () => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [builtIn, setBuiltIn] = useState<Array<{ slug: string; title: string; category: string; date: string }>>([]);
  const [importing, setImporting] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);

  const flash = (ok: boolean, text: string) => {
    setNotice({ ok, text });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/articles', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRows([]);
        flash(false, data.error || 'Chargement impossible.');
        return;
      }
      setRows(data.articles || []);
      setBuiltIn(data.builtIn || []);
    } catch {
      setRows([]);
      flash(false, 'Serveur injoignable.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (id: string) => {
    const res = await fetch(`/api/articles/${id}`, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    const a = data.article;
    if (!res.ok || !a) return flash(false, 'Article introuvable.');
    setDraft({ id: a.id, slug: a.slug, status: a.status, title: a.title, category: a.category || 'Conseils', coverUrl: a.cover_url || '', intro: a.intro || '', blocks: a.blocks || [], metaTitle: a.meta_title || '', description: a.description || '', published_at: a.published_at });
    setDirty(false);
  };

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d));
    setDirty(true);
  };
  const setBlock = (i: number, b: ArticleBlock) => patch({ blocks: draft!.blocks.map((x, k) => (k === i ? b : x)) });
  const addBlock = (b: ArticleBlock) => patch({ blocks: [...draft!.blocks, b] });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (!draft || j < 0 || j >= draft.blocks.length) return;
    const next = [...draft.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    patch({ blocks: next });
  };

  const save = async (status: 'brouillon' | 'publie') => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch(draft.id ? `/api/articles/${draft.id}` : '/api/articles', {
        method: draft.id ? 'PUT' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return flash(false, data.error || "L'enregistrement a échoué.");
      const a = data.article;
      setDraft({ ...draft, id: a.id, slug: a.slug, status: a.status, published_at: a.published_at });
      setDirty(false);
      flash(true, status === 'publie' ? 'Article publié : il est visible sur le site.' : 'Brouillon enregistré.');
      void load();
    } catch {
      flash(false, 'Serveur injoignable.');
    } finally {
      setSaving(false);
    }
  };

  const importBuiltIn = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/articles/import-builtin', { method: 'POST', credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) flash(false, data.error || "L'import a échoué.");
      else {
        flash(true, `${data.imported} article(s) importé(s) : vous pouvez maintenant les modifier.`);
        await load();
      }
    } finally {
      setImporting(false);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Supprimer définitivement l'article « ${title} » ?`)) return;
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE', credentials: 'same-origin' });
    if (res.ok) {
      flash(true, 'Article supprimé.');
      if (draft?.id === id) setDraft(null);
      void load();
    } else flash(false, 'Suppression impossible.');
  };

  const asPost = (d: Draft): BlogPost => ({
    slug: d.slug || 'apercu',
    title: d.title || 'Titre de l\'article',
    metaTitle: d.metaTitle || d.title,
    description: d.description,
    category: d.category,
    date: (d.published_at || new Date().toISOString()).slice(0, 10),
    readingMinutes: Math.max(1, Math.round([d.intro, ...d.blocks.map((b) => (b.type === 'ul' ? b.items.join(' ') : b.type === 'img' ? '' : b.text))].join(' ').split(/\s+/).filter(Boolean).length / 200)),
    intro: d.intro,
    sections: [],
    blocks: d.blocks,
    coverUrl: d.coverUrl || undefined,
    related: [],
  });

  const Notice = notice && (
    <div role="status" className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${notice.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
      {notice.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      {notice.text}
    </div>
  );

  // ---------------- List ----------------
  if (!draft) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Mes articles de blog</h1>
            <p className="text-sm text-stone-600">Écrivez, ajoutez vos photos, publiez : l'article apparaît sur le site et dans Google.</p>
          </div>
          <button type="button" id="btn-new-article" onClick={() => { setDraft({ ...EMPTY }); setDirty(false); }} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold px-4 py-2.5">
            <Plus className="w-4 h-4" /> Nouvel article
          </button>
        </div>
        {Notice}
        {builtIn.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm text-amber-900">
              <strong>{builtIn.length} articles sont déjà publiés sur votre site</strong> (livrés avec le site) mais ils ne sont pas encore modifiables ici. Importez-les pour pouvoir les relire, les corriger et y ajouter des photos. Ils restent en ligne, à la même adresse et à la même date.
            </p>
            <ul className="text-sm text-stone-800 space-y-1">
              {builtIn.map((b) => (
                <li key={b.slug} className="flex items-center justify-between gap-3">
                  <span className="truncate">{b.title}</span>
                  <a href={`/blog/${b.slug}`} target="_blank" rel="noreferrer" className="shrink-0 text-xs underline">Voir</a>
                </li>
              ))}
            </ul>
            <button type="button" id="btn-import-articles" onClick={importBuiltIn} disabled={importing} className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold px-4 py-2.5 disabled:opacity-60">
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              Importer ces articles pour les modifier
            </button>
          </div>
        )}
        {rows === null ? (
          <p className="text-sm text-stone-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Chargement…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-600">
            Vous n'avez pas encore d'article modifiable ici.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white border border-stone-200 p-3">
                {r.cover_url ? <img src={r.cover_url} alt="" className="w-16 h-12 object-cover rounded-md border border-stone-200 shrink-0" /> : <div className="w-16 h-12 rounded-md bg-stone-100 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 truncate">{r.title}</p>
                  <p className="text-xs text-stone-500">
                    <span className={`inline-block rounded-full px-2 py-0.5 font-semibold mr-2 ${r.status === 'publie' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{r.status === 'publie' ? 'Publié' : 'Brouillon'}</span>
                    {r.category} · modifié le {fmtDate(r.updated_at)}
                  </p>
                </div>
                {r.status === 'publie' && (
                  <a href={`/blog/${r.slug}`} target="_blank" rel="noreferrer" className="p-2 text-stone-500 hover:text-stone-900" title="Voir sur le site"><ExternalLink className="w-4 h-4" /></a>
                )}
                <button type="button" onClick={() => open(r.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 px-3 py-1.5 text-xs font-semibold"><Pencil className="w-3.5 h-3.5" />Modifier</button>
                <button type="button" onClick={() => remove(r.id, r.title)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" aria-label={`Supprimer ${r.title}`}><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // ---------------- Editor ----------------
  const metaLen = draft.metaTitle.length;
  const descLen = draft.description.length;
  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => { if (!dirty || window.confirm('Quitter sans enregistrer vos modifications ?')) { setDraft(null); void load(); } }} className="text-sm text-stone-600 underline">← Tous mes articles</button>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.status === 'publie' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{draft.status === 'publie' ? 'Publié' : 'Brouillon'}{dirty ? ' · modifications non enregistrées' : ''}</span>
      </div>
      {Notice}

      <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-5">
        <div>
          <label htmlFor="art-title" className={label}>Titre de l'article</label>
          <input id="art-title" className={`${input} text-base font-semibold`} value={draft.title} onChange={(e) => patch({ title: e.target.value })} maxLength={150} placeholder="Ex : Comment préparer son appartement avant une visite" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="art-cat" className={label}>Catégorie</label>
            <input id="art-cat" list="art-cats" className={input} value={draft.category} onChange={(e) => patch({ category: e.target.value })} maxLength={40} />
            <datalist id="art-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <span className={label}>Photo d'illustration</span>
            <PhotoPicker url={draft.coverUrl} onChange={(url) => patch({ coverUrl: url })} onError={(m) => flash(false, m)} title="Photo d'illustration" />
          </div>
        </div>
        <div>
          <label htmlFor="art-intro" className={label}>Introduction</label>
          <textarea id="art-intro" className={`${input} min-h-[110px] leading-relaxed`} value={draft.intro} onChange={(e) => patch({ intro: e.target.value })} maxLength={1500} placeholder="Deux ou trois phrases qui donnent envie de lire la suite." />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">Contenu</h2>
        {draft.blocks.length === 0 && <p className="text-sm text-stone-500">Ajoutez des blocs avec les boutons ci-dessous : titres de section, paragraphes, listes et photos.</p>}
        {draft.blocks.map((b, i) => (
          <div key={i} className="rounded-xl bg-white border border-stone-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{b.type === 'h2' ? 'Titre de section' : b.type === 'p' ? 'Paragraphe' : b.type === 'ul' ? 'Liste à puces' : 'Photo'}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30" aria-label="Monter"><ArrowUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === draft.blocks.length - 1} className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-30" aria-label="Descendre"><ArrowDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => patch({ blocks: draft.blocks.filter((_, k) => k !== i) })} className="p-1.5 rounded text-rose-600 hover:bg-rose-50" aria-label="Supprimer ce bloc"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {b.type === 'h2' && <input className={`${input} font-semibold`} value={b.text} onChange={(e) => setBlock(i, { type: 'h2', text: e.target.value })} maxLength={150} aria-label="Titre de section" />}
            {b.type === 'p' && <textarea className={`${input} min-h-[100px] leading-relaxed`} value={b.text} onChange={(e) => setBlock(i, { type: 'p', text: e.target.value })} aria-label="Paragraphe" />}
            {b.type === 'ul' && (
              <>
                <textarea className={`${input} min-h-[100px] leading-relaxed`} value={b.items.join('\n')} onChange={(e) => setBlock(i, { type: 'ul', items: e.target.value.split('\n') })} aria-label="Éléments de la liste" placeholder={'Un élément par ligne'} />
                <p className="text-xs text-stone-500">Un élément par ligne.</p>
              </>
            )}
            {b.type === 'img' && (
              <div className="space-y-2">
                <PhotoPicker url={b.url} onChange={(url) => setBlock(i, { ...b, url })} onError={(m) => flash(false, m)} title="Photo de l'article" />
                <input className={input} value={b.alt} onChange={(e) => setBlock(i, { ...b, alt: e.target.value })} maxLength={200} placeholder="Description de la photo (utile à Google et aux malvoyants)" aria-label="Description de la photo" />
                <input className={input} value={b.caption || ''} onChange={(e) => setBlock(i, { ...b, caption: e.target.value })} maxLength={250} placeholder="Légende (facultatif)" aria-label="Légende" />
              </div>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addBlock({ type: 'h2', text: '' })} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold"><Heading2 className="w-3.5 h-3.5" />Titre de section</button>
          <button type="button" onClick={() => addBlock({ type: 'p', text: '' })} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold"><Type className="w-3.5 h-3.5" />Paragraphe</button>
          <button type="button" onClick={() => addBlock({ type: 'ul', items: [''] })} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold"><List className="w-3.5 h-3.5" />Liste</button>
          <button type="button" onClick={() => addBlock({ type: 'img', url: '', alt: '' })} className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 px-3 py-2 text-xs font-semibold"><ImagePlus className="w-3.5 h-3.5" />Photo</button>
        </div>
        <p className="text-xs text-stone-500">Dans un paragraphe : <code>**gras**</code> pour mettre en gras, <code>[texte du lien](/blog/un-autre-article)</code> pour un lien.</p>
      </div>

      <details className="rounded-2xl bg-white border border-stone-200 p-5">
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-wider text-stone-700">Référencement Google (facultatif)</summary>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="art-meta" className={label}>Titre dans Google ({metaLen}/55)</label>
            <input id="art-meta" className={input} value={draft.metaTitle} onChange={(e) => patch({ metaTitle: e.target.value })} maxLength={70} placeholder="Laissez vide : le titre de l'article sera utilisé" />
          </div>
          <div>
            <label htmlFor="art-desc" className={label}>Description dans Google ({descLen}/155)</label>
            <textarea id="art-desc" className={`${input} min-h-[80px]`} value={draft.description} onChange={(e) => patch({ description: e.target.value })} maxLength={170} placeholder="Laissez vide : le début de l'introduction sera utilisé" />
          </div>
        </div>
      </details>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setPreview(true)} className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-4 py-2.5 text-sm font-semibold"><Eye className="w-4 h-4" />Aperçu</button>
          <button type="button" onClick={() => save('brouillon')} disabled={saving} className="rounded-xl border border-stone-300 bg-white hover:bg-stone-50 px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{draft.status === 'publie' ? 'Dépublier (brouillon)' : 'Enregistrer le brouillon'}</button>
          <button type="button" id="btn-publish-article" onClick={() => save('publie')} disabled={saving || !draft.title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-bold px-5 py-2.5 text-sm disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {draft.status === 'publie' ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[70] bg-white overflow-y-auto" role="dialog" aria-modal="true" aria-label="Aperçu de l'article">
          <div className="sticky top-0 z-10 bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between text-sm">
            <span>Aperçu : voici l'article tel que les visiteurs le verront</span>
            <button type="button" onClick={() => setPreview(false)} className="rounded-lg bg-white/15 hover:bg-white/25 px-3 py-1.5 font-semibold">Fermer</button>
          </div>
          <BlogArticle post={asPost(draft)} />
        </div>
      )}
    </div>
  );
};
