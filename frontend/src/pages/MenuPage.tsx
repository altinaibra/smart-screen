import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import MediaPicker, { MediaThumb } from '../components/MediaPicker';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import type { Category, Media, Product, Settings } from '../types';

type ProductForm = Omit<Product, 'id' | 'price' | 'oldPrice'> & { id?: number; price: string; oldPrice: string };

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [currency, setCurrency] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductForm | null>(null);
  const [category, setCategory] = useState<{ id?: number; name: string; sortOrder: number } | null>(null);

  const load = useCallback(() => {
    api<Category[]>('/menu/categories').then(c => {
      setCategories(c);
      setSelected(s => (s && c.some(x => x.id === s) ? s : c[0]?.id ?? null));
    }).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    api<Settings>('/settings').then(s => setCurrency(s.currency)).catch(() => {});
  }, [load]);

  const current = categories.find(c => c.id === selected);

  async function toggleAvailable(p: Product) {
    await api(`/menu/products/${p.id}/availability`, { method: 'PATCH', json: { isAvailable: !p.isAvailable } })
      .catch(e => setError(e.message));
    load();
  }

  async function removeProduct(p: Product) {
    if (!confirm(`Të fshihet "${p.name}"?`)) return;
    await api(`/menu/products/${p.id}`, { method: 'DELETE' }).catch(e => setError(e.message));
    load();
  }

  async function removeCategory(c: Category) {
    if (!confirm(`Të fshihet kategoria "${c.name}" me gjithë ${c.products.length} produktet?`)) return;
    await api(`/menu/categories/${c.id}`, { method: 'DELETE' }).catch(e => setError(e.message));
    load();
  }

  const openNewProduct = () => current && setProduct({
    categoryId: current.id, name: '', description: '', price: '', oldPrice: '', imageAssetId: null, imageUrl: null,
    isAvailable: true, isFeatured: false, sortOrder: current.products.length + 1,
  });

  return (
    <>
      <PageHeader
        title="Menuja & Çmimet"
        subtitle="Ushqimet, pijet dhe ofertat që shfaqen në slide-t e menusë. Ndryshimet e çmimeve dalin menjëherë në TV."
        actions={<button className="btn" onClick={() => setCategory({ name: '', sortOrder: categories.length + 1 })}>+ Kategori</button>}
      />
      <ErrorBox error={error} />

      <div className="menu-layout">
        <div className="card category-list">
          {categories.length === 0 && <p className="muted">Nuk ka kategori.</p>}
          {categories.map(c => (
            <button key={c.id} className={`category-item ${c.id === selected ? 'active' : ''}`} onClick={() => setSelected(c.id)}>
              <span>{c.name}</span>
              <span className="count">{c.products.length}</span>
            </button>
          ))}
        </div>

        <div className="card grow">
          {!current ? <Empty>Krijoni një kategori për të filluar.</Empty> : (
            <>
              <div className="card-header">
                <h2>{current.name}</h2>
                <div className="actions">
                  <button className="btn" onClick={() => setCategory({ id: current.id, name: current.name, sortOrder: current.sortOrder })}>Riemërto</button>
                  <button className="btn danger ghost" onClick={() => removeCategory(current)}>Fshi kategorinë</button>
                  <button className="btn primary" onClick={openNewProduct}>+ Produkt</button>
                </div>
              </div>
              {current.products.length === 0 ? <Empty>Nuk ka produkte në këtë kategori.</Empty> : (
                <table className="table">
                  <thead><tr><th /><th>Produkti</th><th>Çmimi</th><th>Statusi</th><th /></tr></thead>
                  <tbody>
                    {current.products.map(p => (
                      <tr key={p.id} className={p.isAvailable ? '' : 'faded'}>
                        <td className="thumb-cell">{p.imageUrl ? <img className="thumb" src={p.imageUrl} alt="" /> : <div className="thumb empty-thumb">{p.name[0]}</div>}</td>
                        <td>
                          <div className="strong">{p.name} {p.isFeatured && <span className="tag yellow">★ E veçuar</span>}</div>
                          {p.description && <div className="muted">{p.description}</div>}
                        </td>
                        <td className="nowrap">
                          {p.oldPrice ? <s className="muted">{p.oldPrice} {currency}</s> : null} <strong>{p.price} {currency}</strong>
                        </td>
                        <td>
                          <button className={`tag clickable ${p.isAvailable ? 'green' : 'gray'}`} onClick={() => toggleAvailable(p)}
                            title="Kliko për të ndryshuar">
                            {p.isAvailable ? 'Në dispozicion' : 'E mbaruar'}
                          </button>
                        </td>
                        <td className="right nowrap">
                          <button className="btn" onClick={() => setProduct({ ...p, price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '' })}>Ndrysho</button>{' '}
                          <button className="btn danger ghost" onClick={() => removeProduct(p)}>Fshi</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {product && <ProductModal form={product} categories={categories} currency={currency} onClose={() => setProduct(null)} onDone={() => { setProduct(null); load(); }} />}
      {category && <CategoryModal form={category} onClose={() => setCategory(null)} onDone={id => { setCategory(null); if (id) setSelected(id); load(); }} />}
    </>
  );
}

function ProductModal({ form: initial, categories, currency, onClose, onDone }: {
  form: ProductForm; categories: Category[]; currency: string; onClose: () => void; onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [image, setImage] = useState<Media | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<ProductForm>) => setForm(f => ({ ...f, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null };
    try {
      await api(form.id ? `/menu/products/${form.id}` : '/menu/products', { method: form.id ? 'PUT' : 'POST', json: body });
      onDone();
    } catch (err) { setError((err as Error).message); }
  }

  const imageUrl = image?.url ?? form.imageUrl;

  return (
    <Modal title={form.id ? 'Ndrysho produktin' : 'Produkt i ri'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulo</button><button className="btn primary" form="product-form">Ruaj</button></>}>
      <form id="product-form" onSubmit={submit}>
        <ErrorBox error={error} />
        <div className="product-form-top">
          <button type="button" className="thumb-btn" onClick={() => setPicking(true)}>
            {imageUrl ? <img className="thumb" src={imageUrl} alt="" /> : <MediaThumb media={null} />}
            <span>{imageUrl ? 'Ndrysho foton' : 'Zgjidh foto'}</span>
          </button>
          <div className="grow">
            <Field label="Emri"><input value={form.name} onChange={e => set({ name: e.target.value })} required autoFocus /></Field>
            <Field label="Përshkrimi"><input value={form.description ?? ''} onChange={e => set({ description: e.target.value })} /></Field>
          </div>
        </div>
        {imageUrl && <button type="button" className="link" onClick={() => { setImage(null); set({ imageAssetId: null, imageUrl: null }); }}>Hiq foton</button>}
        <div className="grid-2">
          <Field label={`Çmimi (${currency})`}><input type="number" step="0.01" min="0" value={form.price} onChange={e => set({ price: e.target.value })} required /></Field>
          <Field label="Çmimi i vjetër (për ofertë)" hint="Shfaqet i vizatuar me % zbritje">
            <input type="number" step="0.01" min="0" value={form.oldPrice} onChange={e => set({ oldPrice: e.target.value })} />
          </Field>
          <Field label="Kategoria">
            <select value={form.categoryId} onChange={e => set({ categoryId: Number(e.target.value) })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Renditja"><input type="number" value={form.sortOrder} onChange={e => set({ sortOrder: Number(e.target.value) })} /></Field>
        </div>
        <label className="inline-check"><input type="checkbox" checked={form.isAvailable} onChange={e => set({ isAvailable: e.target.checked })} /> Në dispozicion</label>
        <label className="inline-check"><input type="checkbox" checked={form.isFeatured} onChange={e => set({ isFeatured: e.target.checked })} /> E veçuar (shfaqet te "Ofertat")</label>
      </form>
      {picking && <MediaPicker type="Image" onClose={() => setPicking(false)} onSelect={m => { setImage(m); set({ imageAssetId: m.id, imageUrl: m.url }); }} />}
    </Modal>
  );
}

function CategoryModal({ form: initial, onClose, onDone }: {
  form: { id?: number; name: string; sortOrder: number }; onClose: () => void; onDone: (id?: number) => void;
}) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await api<Category>(form.id ? `/menu/categories/${form.id}` : '/menu/categories', {
        method: form.id ? 'PUT' : 'POST', json: form,
      });
      onDone(res.id);
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Modal title={form.id ? 'Ndrysho kategorinë' : 'Kategori e re'} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Anulo</button><button className="btn primary" form="cat-form">Ruaj</button></>}>
      <form id="cat-form" onSubmit={submit}>
        <ErrorBox error={error} />
        <Field label="Emri"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="p.sh. Pica, Sallata, Ëmbëlsira" required autoFocus /></Field>
        <Field label="Renditja"><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
      </form>
    </Modal>
  );
}
