import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../components/Icon';
import MediaPicker, { MediaThumb } from '../components/MediaPicker';
import { Empty, ErrorBox, Field, Modal, PageHeader } from '../components/ui';
import {
  useCategories, useDeleteCategory, useDeleteProduct, useSaveCategory, useSaveProduct, useSetProductAvailability,
} from '../services/Menu/menuQueries';
import { useSettings } from '../services/Settings/settingsQueries';
import type { Category, Media, Product } from '../types';

type ProductForm = Omit<Product, 'id' | 'price' | 'oldPrice'> & { id?: number; price: string; oldPrice: string };

export default function MenuPage() {
  const { t } = useTranslation();
  const { data: categories = [], error: loadError } = useCategories();
  // Simboli i valutës kryesore (isMainCurrency) – rifreskohet vetë kur ndërrohet valuta.
  const { data: settings } = useSettings();
  const currency = settings?.currency ?? '';
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductForm | null>(null);
  const [category, setCategory] = useState<{ id?: number; name: string; sortOrder: number } | null>(null);
  const { mutateAsync: setAvailability } = useSetProductAvailability();
  const { mutateAsync: deleteProduct } = useDeleteProduct();
  const { mutateAsync: deleteCategory } = useDeleteCategory();

  // Kategoria e zgjedhur; nëse fshihet (ose s'është zgjedhur), merret e para.
  const selected = chosen && categories.some(c => c.id === chosen) ? chosen : categories[0]?.id ?? null;
  const current = categories.find(c => c.id === selected);

  async function toggleAvailable(p: Product) {
    await setAvailability({ id: p.id, isAvailable: !p.isAvailable }).catch(e => setError(e.message));
  }

  async function removeProduct(p: Product) {
    if (!confirm(t('menu.confirmDeleteProduct', { name: p.name }))) return;
    await deleteProduct(p.id).catch(e => setError(e.message));
  }

  async function removeCategory(c: Category) {
    if (!confirm(t('menu.confirmDeleteCategory', { name: c.name, count: c.products.length }))) return;
    await deleteCategory(c.id).catch(e => setError(e.message));
  }

  const openNewProduct = () => current && setProduct({
    categoryId: current.id, name: '', description: '', price: '', oldPrice: '', imageAssetId: null, imageUrl: null,
    isAvailable: true, isFeatured: false, sortOrder: current.products.length + 1,
  });

  return (
    <>
      <PageHeader
        title={t('menu.title')}
        subtitle={t('menu.subtitle')}
        actions={<button className="btn" onClick={() => setCategory({ name: '', sortOrder: categories.length + 1 })}><Icon name="plus" />{t('menu.addCategory')}</button>}
      />
      <ErrorBox error={error ?? loadError?.message ?? null} />

      <div className="menu-layout">
        <div className="card category-list">
          {categories.length === 0 && <p className="muted">{t('menu.noCategories')}</p>}
          {categories.map(c => (
            <button key={c.id} className={`category-item ${c.id === selected ? 'active' : ''}`} onClick={() => setChosen(c.id)}>
              <span>{c.name}</span>
              <span className="count">{c.products.length}</span>
            </button>
          ))}
        </div>

        <div className="card grow">
          {!current ? <Empty>{t('menu.createFirst')}</Empty> : (
            <>
              <div className="card-header">
                <h2>{current.name}</h2>
                <div className="actions">
                  <button className="btn" onClick={() => setCategory({ id: current.id, name: current.name, sortOrder: current.sortOrder })}>{t('common.rename')}</button>
                  <button className="btn danger ghost" onClick={() => removeCategory(current)}>{t('menu.deleteCategory')}</button>
                  <button className="btn primary" onClick={openNewProduct}><Icon name="plus" />{t('menu.addProduct')}</button>
                </div>
              </div>
              {current.products.length === 0 ? <Empty>{t('menu.noProducts')}</Empty> : (
                <table className="table">
                  <thead><tr><th /><th>{t('menu.colProduct')}</th><th>{t('menu.colPrice')}</th><th>{t('menu.colStatus')}</th><th /></tr></thead>
                  <tbody>
                    {current.products.map(p => (
                      <tr key={p.id} className={p.isAvailable ? '' : 'faded'}>
                        <td className="thumb-cell">{p.imageUrl ? <img className="thumb" src={p.imageUrl} alt="" /> : <div className="thumb empty-thumb">{p.name[0]}</div>}</td>
                        <td>
                          <div className="strong">{p.name} {p.isFeatured && <span className="tag yellow"><Icon name="star" />{t('menu.featured')}</span>}</div>
                          {p.description && <div className="muted">{p.description}</div>}
                        </td>
                        <td className="nowrap">
                          {p.oldPrice ? <s className="muted">{p.oldPrice} {currency}</s> : null} <strong>{p.price} {currency}</strong>
                        </td>
                        <td>
                          <button className={`tag clickable ${p.isAvailable ? 'green' : 'gray'}`} onClick={() => toggleAvailable(p)}
                            title={t('menu.toggleHint')}>
                            {p.isAvailable ? t('menu.available') : t('menu.soldOut')}
                          </button>
                        </td>
                        <td className="right nowrap">
                          <button className="btn" onClick={() => setProduct({ ...p, price: String(p.price), oldPrice: p.oldPrice ? String(p.oldPrice) : '' })}>{t('common.edit')}</button>{' '}
                          <button className="btn danger ghost" onClick={() => removeProduct(p)}>{t('common.delete')}</button>
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

      {product && <ProductModal form={product} categories={categories} currency={currency} onClose={() => setProduct(null)} onDone={() => setProduct(null)} />}
      {category && <CategoryModal form={category} onClose={() => setCategory(null)} onDone={id => { setCategory(null); if (id) setChosen(id); }} />}
    </>
  );
}

function ProductModal({ form: initial, categories, currency, onClose, onDone }: {
  form: ProductForm; categories: Category[]; currency: string; onClose: () => void; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [picking, setPicking] = useState(false);
  const [image, setImage] = useState<Media | null>(null);
  const { mutate: saveProduct, error } = useSaveProduct();
  const set = (patch: Partial<ProductForm>) => setForm(f => ({ ...f, ...patch }));

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null };
    saveProduct(body, { onSuccess: onDone });
  }

  const imageUrl = image?.url ?? form.imageUrl;

  return (
    <Modal title={form.id ? t('menu.editProduct') : t('menu.newProduct')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="product-form">{t('common.save')}</button></>}>
      <form id="product-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <div className="product-form-top">
          <button type="button" className="thumb-btn" onClick={() => setPicking(true)}>
            {imageUrl ? <img className="thumb" src={imageUrl} alt="" /> : <MediaThumb media={null} />}
            <span>{imageUrl ? t('menu.changePhoto') : t('menu.pickPhoto')}</span>
          </button>
          <div className="grow">
            <Field label={t('common.name')}><input value={form.name} onChange={e => set({ name: e.target.value })} required autoFocus /></Field>
            <Field label={t('common.description')}><input value={form.description ?? ''} onChange={e => set({ description: e.target.value })} /></Field>
          </div>
        </div>
        {imageUrl && <button type="button" className="link" onClick={() => { setImage(null); set({ imageAssetId: null, imageUrl: null }); }}>{t('menu.removePhoto')}</button>}
        <div className="grid-2">
          <Field label={t('menu.price', { currency })}><input type="number" step="0.01" min="0" value={form.price} onChange={e => set({ price: e.target.value })} required /></Field>
          <Field label={t('menu.oldPrice')} hint={t('menu.oldPriceHint')}>
            <input type="number" step="0.01" min="0" value={form.oldPrice} onChange={e => set({ oldPrice: e.target.value })} />
          </Field>
          <Field label={t('menu.category')}>
            <select value={form.categoryId} onChange={e => set({ categoryId: Number(e.target.value) })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label={t('common.sortOrder')}><input type="number" value={form.sortOrder} onChange={e => set({ sortOrder: Number(e.target.value) })} /></Field>
        </div>
        <label className="inline-check"><input type="checkbox" checked={form.isAvailable} onChange={e => set({ isAvailable: e.target.checked })} /> {t('menu.available')}</label>
        <label className="inline-check"><input type="checkbox" checked={form.isFeatured} onChange={e => set({ isFeatured: e.target.checked })} /> {t('menu.featuredCheck')}</label>
      </form>
      {picking && <MediaPicker type="Image" onClose={() => setPicking(false)} onSelect={m => { setImage(m); set({ imageAssetId: m.id, imageUrl: m.url }); }} />}
    </Modal>
  );
}

function CategoryModal({ form: initial, onClose, onDone }: {
  form: { id?: number; name: string; sortOrder: number }; onClose: () => void; onDone: (id?: number) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const { mutate: saveCategory, error } = useSaveCategory();

  function submit(e: FormEvent) {
    e.preventDefault();
    saveCategory(form, { onSuccess: res => onDone(res.id) });
  }

  return (
    <Modal title={form.id ? t('menu.editCategory') : t('menu.newCategory')} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>{t('common.cancel')}</button><button className="btn primary" form="cat-form">{t('common.save')}</button></>}>
      <form id="cat-form" onSubmit={submit}>
        <ErrorBox error={error?.message ?? null} />
        <Field label={t('common.name')}><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('menu.categoryPlaceholder')} required autoFocus /></Field>
        <Field label={t('common.sortOrder')}><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
      </form>
    </Modal>
  );
}
