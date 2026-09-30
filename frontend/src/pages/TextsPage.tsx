import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import type { Language, UiText } from '../types';

type LanguageForm = { id?: number; code: string; name: string; sortOrder: number; copyFromLanguageId: number | null };

/** Gjuhët dhe tekstet që shfaq TV-ja (ekrani i çiftimit, "E mbaruar", "Ofertat" ...). */
export default function TextsPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [texts, setTexts] = useState<UiText[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LanguageForm | null>(null);

  const loadLanguages = useCallback(() => {
    api<Language[]>('/languages').then(l => {
      setLanguages(l);
      setSelected(s => (s && l.some(x => x.id === s) ? s : l[0]?.id ?? null));
    }).catch(e => setError(e.message));
  }, []);

  useEffect(() => { loadLanguages(); }, [loadLanguages]);

  useEffect(() => {
    if (selected == null) { setTexts([]); return; }
    api<UiText[]>(`/languages/${selected}/texts`).then(t => { setTexts(t); setDirty(false); setSaved(false); })
      .catch(e => setError(e.message));
  }, [selected]);

  const current = languages.find(l => l.id === selected);

  function selectLanguage(id: number) {
    if (dirty && !confirm('Ndryshimet e paruajtura do të humbin. Të vazhdohet?')) return;
    setSelected(id);
  }

  function edit(index: number, patch: Partial<UiText>) {
    setTexts(t => t.map((x, i) => (i === index ? { ...x, ...patch } : x)));
    setDirty(true);
    setSaved(false);
  }

  function remove(index: number) {
    setTexts(t => t.filter((_, i) => i !== index));
    setDirty(true);
    setSaved(false);
  }

  async function saveTexts() {
    if (!current) return;
    setError(null);
    try {
      setTexts(await api<UiText[]>(`/languages/${current.id}/texts`, { method: 'PUT', json: texts.filter(t => t.key.trim()) }));
      setDirty(false);
      setSaved(true);
      loadLanguages();
    } catch (err) { setError((err as Error).message); }
  }

  async function saveLanguage(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    try {
      const body = { code: form.code, name: form.name, sortOrder: form.sortOrder, copyFromLanguageId: form.copyFromLanguageId };
      const res = form.id
        ? await api<Language>(`/languages/${form.id}`, { method: 'PUT', json: body })
        : await api<Language>('/languages', { method: 'POST', json: body });
      setForm(null);
      loadLanguages();
      setSelected(res.id);
    } catch (err) { setError((err as Error).message); }
  }

  async function removeLanguage(l: Language) {
    if (!confirm(`Të fshihet gjuha "${l.name}" me gjithë ${l.textCount} tekstet?`)) return;
    await api(`/languages/${l.id}`, { method: 'DELETE' }).catch(e => setError(e.message));
    loadLanguages();
  }

  return (
    <>
      <PageHeader
        title="Tekstet e TV-së"
        subtitle="Çdo tekst që shfaqet në ekranet (çiftimi, lidhja, 'E mbaruar', 'Ofertat' ...) ruhet këtu. Gjuha aktive zgjidhet te Cilësimet."
        actions={<button className="btn" onClick={() => setForm({ code: '', name: '', sortOrder: languages.length, copyFromLanguageId: selected })}>+ Gjuhë</button>}
      />
      <ErrorBox error={error} />

      <div className="texts-layout">
        <div className="card">
          {languages.length === 0 && <p className="muted">Nuk ka gjuhë.</p>}
          {languages.map(l => (
            <button key={l.id} className={`category-item ${l.id === selected ? 'active' : ''}`} onClick={() => selectLanguage(l.id)}>
              <span>{l.name} <span className="muted small">({l.code})</span></span>
              <span className="count">{l.textCount}</span>
            </button>
          ))}
        </div>

        <div className="card grow">
          {!current ? <Empty>Krijoni një gjuhë për të filluar.</Empty> : (
            <>
              <div className="card-header">
                <h2>{current.name}</h2>
                <div className="actions">
                  <button className="btn" onClick={() => setForm({ ...current, copyFromLanguageId: null })}>Ndrysho</button>
                  <button className="btn text-danger" onClick={() => removeLanguage(current)}>Fshi</button>
                </div>
              </div>

              <table className="table">
                <thead><tr><th style={{ width: '32%' }}>Çelësi</th><th>Teksti</th><th /></tr></thead>
                <tbody>
                  {texts.map((t, i) => (
                    <tr key={i} className="text-row">
                      <td><input className="key" value={t.key} onChange={e => edit(i, { key: e.target.value })} placeholder="p.sh. product.soldOut" /></td>
                      <td><input value={t.value} onChange={e => edit(i, { value: e.target.value })} /></td>
                      <td className="right"><button className="icon-btn" onClick={() => remove(i)} aria-label="Fshi">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {texts.length === 0 && <p className="muted">Nuk ka tekste për këtë gjuhë.</p>}

              <div className="form-actions" style={{ justifyContent: 'space-between' }}>
                <button className="btn" onClick={() => { setTexts(t => [...t, { key: '', value: '' }]); setDirty(true); }}>+ Tekst</button>
                <button className="btn primary" onClick={saveTexts} disabled={!dirty}>{saved ? '✓ U ruajt' : 'Ruaj tekstet'}</button>
              </div>
            </>
          )}
        </div>
      </div>

      {form && (
        <Modal
          title={form.id ? 'Ndrysho gjuhën' : 'Gjuhë e re'}
          onClose={() => setForm(null)}
          footer={<><button className="btn" onClick={() => setForm(null)}>Anulo</button><button className="btn primary" form="language-form">Ruaj</button></>}
        >
          <form id="language-form" onSubmit={saveLanguage}>
            <div className="grid-2">
              <Field label="Emri"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="p.sh. Deutsch" required autoFocus /></Field>
              <Field label="Kodi" hint="ISO, p.sh. sq, en, de"><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} pattern="[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?" required /></Field>
            </div>
            <Field label="Renditja"><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
            {!form.id && (
              <Field label="Kopjo tekstet nga" hint="Çelësat kopjohen si pikënisje për përkthim">
                <select value={form.copyFromLanguageId ?? ''} onChange={e => setForm({ ...form, copyFromLanguageId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">— Asnjë —</option>
                  {languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </Field>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}
