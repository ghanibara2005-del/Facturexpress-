'use client';

import { useEffect, useMemo, useState } from 'react';

type Client = { id: string; name: string; email: string; siren: string; address: string };
type Line = { description: string; quantity: number; unitPrice: number; vat: number };
type Doc = { id: string; number: string; kind: 'Devis' | 'Facture'; clientId: string; date: string; dueDate: string; status: 'Brouillon' | 'Envoyée' | 'Payée' | 'Accepté'; lines: Line[]; sourceQuote?: string };
type Store = { clients: Client[]; docs: Doc[] };

const STORAGE_KEY = 'facturexpress-v1';
const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
const dateFr = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
const totals = (lines: Line[]) => lines.reduce((acc, line) => {
  const ht = line.quantity * line.unitPrice;
  acc.ht += ht; acc.vat += ht * line.vat / 100; return acc;
}, { ht: 0, vat: 0 });
const emptyStore: Store = { clients: [], docs: [] };

function seedStore(): Store {
  const clients: Client[] = [
    { id: 'c1', name: 'Atelier Nord', email: 'contact@ateliernord.fr', siren: '812345678', address: '12 rue des Lilas, 59000 Lille' },
    { id: 'c2', name: 'Maison Rivage', email: 'bonjour@maisonrivage.fr', siren: '912345678', address: '8 avenue du Port, 44000 Nantes' },
    { id: 'c3', name: 'Studio Mistral', email: 'hello@studiomistral.fr', siren: '732456789', address: '24 rue Paradis, 13006 Marseille' },
  ];
  const docs: Doc[] = [
    { id: 'd1', number: 'FAC-2026-004', kind: 'Facture', clientId: 'c1', date: '2026-11-18', dueDate: '2026-12-18', status: 'Payée', lines: [{ description: 'Identité visuelle', quantity: 1, unitPrice: 1450, vat: 20 }] },
    { id: 'd2', number: 'FAC-2026-003', kind: 'Facture', clientId: 'c2', date: '2026-11-15', dueDate: '2026-12-15', status: 'Envoyée', lines: [{ description: 'Site vitrine', quantity: 1, unitPrice: 2200, vat: 20 }] },
    { id: 'd3', number: 'DEV-2026-008', kind: 'Devis', clientId: 'c3', date: '2026-11-20', dueDate: '2026-12-20', status: 'Envoyée', lines: [{ description: 'Direction artistique', quantity: 3, unitPrice: 480, vat: 20 }] },
    { id: 'd4', number: 'FAC-2026-002', kind: 'Facture', clientId: 'c3', date: '2026-11-07', dueDate: '2026-12-07', status: 'Payée', lines: [{ description: 'Conseil créatif', quantity: 2, unitPrice: 350, vat: 20 }] },
  ];
  return { clients, docs };
}

export default function Dashboard() {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState('Vue d’ensemble');
  const [modal, setModal] = useState<'client' | 'doc' | null>(null);
  const [docKind, setDocKind] = useState<'Devis' | 'Facture'>('Devis');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setStore(stored ? JSON.parse(stored) as Store : seedStore());
    } catch { setStore(seedStore()); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store, ready]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);

  const clientFor = (id: string) => store.clients.find(client => client.id === id)?.name ?? 'Client supprimé';
  const docs = useMemo(() => store.docs.filter(doc => `${doc.number} ${clientFor(doc.clientId)} ${doc.kind}`.toLowerCase().includes(search.toLowerCase())), [store, search]);
  const paid = store.docs.filter(doc => doc.kind === 'Facture' && doc.status === 'Payée').reduce((sum, doc) => sum + totals(doc.lines).ht + totals(doc.lines).vat, 0);
  const pending = store.docs.filter(doc => doc.kind === 'Facture' && doc.status !== 'Payée').reduce((sum, doc) => sum + totals(doc.lines).ht + totals(doc.lines).vat, 0);
  const recent = [...store.docs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  function updateDoc(id: string, status: Doc['status']) {
    setStore(current => ({ ...current, docs: current.docs.map(doc => doc.id === id ? { ...doc, status } : doc) }));
    setNotice('Statut du document mis à jour.');
  }
  function convertQuote(doc: Doc) {
    if (store.docs.some(item => item.sourceQuote === doc.id)) { setNotice('Ce devis a déjà été converti.'); return; }
    const invoice: Doc = { ...doc, id: crypto.randomUUID(), number: `FAC-${new Date().getFullYear()}-${String(store.docs.filter(item => item.kind === 'Facture').length + 1).padStart(3, '0')}`, kind: 'Facture', date: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: 'Brouillon', sourceQuote: doc.id };
    setStore(current => ({ ...current, docs: [...current.docs, invoice] })); setSection('Factures'); setNotice(`Devis converti en ${invoice.number}.`);
  }
  function printDoc(doc: Doc) {
    const client = store.clients.find(item => item.id === doc.clientId);
    const { ht, vat } = totals(doc.lines);
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { setNotice('Autorisez les fenêtres contextuelles pour imprimer le document.'); return; }
    const rows = doc.lines.map(line => `<tr><td>${escapeHtml(line.description)}</td><td>${line.quantity}</td><td>${money(line.unitPrice)}</td><td>${line.vat}%</td><td>${money(line.quantity * line.unitPrice)}</td></tr>`).join('');
    win.document.write(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>${doc.number}</title><style>body{font:15px Arial,sans-serif;color:#17221e;margin:50px}h1{color:#176b52}table{width:100%;border-collapse:collapse;margin:32px 0}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}.total{text-align:right;line-height:2}.muted{color:#65736c}</style><h1>FactureXpress</h1><p class="muted">${doc.kind} · ${doc.number} · ${dateFr(doc.date)}</p><h2>${doc.kind} à l’attention de</h2><p><strong>${escapeHtml(client?.name ?? '')}</strong><br>${escapeHtml(client?.address ?? '')}<br>${escapeHtml(client?.email ?? '')}</p><table><thead><tr><th>Description</th><th>Qté</th><th>Prix HT</th><th>TVA</th><th>Total HT</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total HT : ${money(ht)}<br>TVA : ${money(vat)}<br><strong>Total TTC : ${money(ht + vat)}</strong></div><script>window.onload=()=>window.print()</script></html>`);
    win.document.close();
  }

  const nav = ['Vue d’ensemble', 'Clients', 'Devis', 'Factures'];
  const visibleDocs = docs.filter(doc => section === 'Devis' ? doc.kind === 'Devis' : section === 'Factures' ? doc.kind === 'Facture' : true);

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); setSection('Vue d’ensemble'); }}><span className="brand-icon">F</span><span>facture<span className="brand-light">xpress</span></span></a>
      <div className="workspace"><div className="workspace-avatar">A</div><div><strong>Atelier créatif</strong><small>Votre espace</small></div><span className="chevron">⌄</span></div>
      <p className="nav-label">ESPACE DE TRAVAIL</p>
      <nav>{nav.map((item, index) => <button key={item} className={`nav-item ${section === item ? 'active' : ''}`} onClick={() => setSection(item)}><span className="nav-icon">{['⌂', '♙', '▤', '▣'][index]}</span>{item}{item === 'Factures' && <span className="nav-count">{store.docs.filter(doc => doc.kind === 'Facture').length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><span>✦</span><strong>Un coup de main ?</strong><p>Consultez notre guide de démarrage.</p><button onClick={() => setNotice('Bienvenue sur votre espace FactureXpress.')}>Ouvrir le guide <span>→</span></button></div><div className="profile"><div className="profile-avatar">GB</div><div><strong>Gabriel B.</strong><small>Administrateur</small></div><button className="dots" aria-label="Options">···</button></div></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumb">Mon espace <span>/</span> <strong>{section}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Aide" onClick={() => setNotice('Besoin d’aide ? Consultez le guide de démarrage.')}>?</button><button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice('Vous êtes à jour.')}>♧</button><div className="mini-avatar">GB</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">DIMANCHE 22 NOVEMBRE 2026</div><h1>{section === 'Vue d’ensemble' ? 'Bonjour Gabriel 👋' : section}</h1><p>{section === 'Vue d’ensemble' ? 'Voici ce qui se passe dans votre activité.' : section === 'Clients' ? 'Retrouvez et gérez vos clients.' : `Créez et suivez vos ${section.toLowerCase()}.`}</p></div><div className="heading-buttons">{section === 'Clients' ? <button className="primary-button" onClick={() => setModal('client')}><span>＋</span> Nouveau client</button> : section !== 'Vue d’ensemble' ? <button className="primary-button" onClick={() => { setDocKind(section === 'Factures' ? 'Facture' : 'Devis'); setModal('doc'); }}><span>＋</span> Nouveau {section === 'Factures' ? 'une facture' : 'un devis'}</button> : <button className="primary-button" onClick={() => { setDocKind('Devis'); setModal('doc'); }}><span>＋</span> Créer un devis</button>}</div></div>

        {section === 'Vue d’ensemble' && <>
          <div className="stats-grid"><Stat label="Chiffre d’affaires encaissé" value={money(paid)} detail="Factures payées" icon="↗" tone="green"/><Stat label="En attente de paiement" value={money(pending)} detail="Factures à suivre" icon="◷" tone="amber"/><Stat label="Clients actifs" value={String(store.clients.length)} detail="Dans votre espace" icon="♙" tone="blue"/><Stat label="Devis en cours" value={String(store.docs.filter(doc => doc.kind === 'Devis' && doc.status !== 'Accepté').length)} detail="En attente de réponse" icon="▤" tone="violet"/></div>
          <div className="dashboard-grid"><div className="panel documents-panel"><div className="panel-heading"><div><h2>Documents récents</h2><p>Vos dernières activités commerciales</p></div><button className="text-button" onClick={() => setSection('Factures')}>Tout voir <span>→</span></button></div><DocumentTable docs={recent} clientFor={clientFor} onPrint={printDoc} onStatus={updateDoc} onConvert={convertQuote}/></div><div className="panel quick-panel"><div className="panel-heading"><div><h2>Actions rapides</h2><p>Gagnez du temps au quotidien</p></div></div><button className="quick-action" onClick={() => { setDocKind('Devis'); setModal('doc'); }}><span className="quick-icon mint">▤</span><span><strong>Créer un devis</strong><small>Préparez une proposition commerciale</small></span><b>→</b></button><button className="quick-action" onClick={() => { setDocKind('Facture'); setModal('doc'); }}><span className="quick-icon peach">▣</span><span><strong>Créer une facture</strong><small>Facturez un client en quelques clics</small></span><b>→</b></button><button className="quick-action" onClick={() => setModal('client')}><span className="quick-icon lilac">♙</span><span><strong>Ajouter un client</strong><small>Complétez votre carnet d’adresses</small></span><b>→</b></button><div className="tip"><span>✦</span><p><strong>Astuce du jour</strong><br/>Convertissez vos devis acceptés en factures sans ressaisir les informations.</p></div></div></div>
        </>}

        {section === 'Clients' && <div className="panel listing-panel"><div className="panel-heading"><div><h2>Carnet clients <span className="soft-count">{store.clients.length}</span></h2><p>Les coordonnées enregistrées dans votre espace</p></div><Search value={search} setValue={setSearch} placeholder="Rechercher un client..."/></div>{store.clients.length ? <div className="client-list">{store.clients.filter(client => `${client.name} ${client.email} ${client.siren}`.toLowerCase().includes(search.toLowerCase())).map(client => <div className="client-row" key={client.id}><div className="client-avatar">{client.name.slice(0, 1).toUpperCase()}</div><div className="client-info"><strong>{client.name}</strong><small>{client.email}</small></div><div className="client-siren"><small>SIREN</small><span>{client.siren || '—'}</span></div><div className="client-address">{client.address || 'Adresse non renseignée'}</div><button className="dots" aria-label="Supprimer" onClick={() => { if (confirm(`Supprimer ${client.name} ?`)) setStore(current => ({ ...current, clients: current.clients.filter(item => item.id !== client.id) })); }}>···</button></div>)}</div> : <EmptyState title="Aucun client pour le moment" text="Ajoutez votre premier client pour créer un devis ou une facture." action="Ajouter un client" onClick={() => setModal('client')}/>}</div>}

        {(section === 'Devis' || section === 'Factures') && <div className="panel listing-panel"><div className="panel-heading"><div><h2>{section} <span className="soft-count">{visibleDocs.length}</span></h2><p>Consultez, imprimez et mettez à jour vos documents</p></div><Search value={search} setValue={setSearch} placeholder="N° ou nom du client..."/></div><DocumentTable docs={visibleDocs} clientFor={clientFor} onPrint={printDoc} onStatus={updateDoc} onConvert={convertQuote}/></div>}
      </div>
    </section>
    {notice && <div className="toast">✓ &nbsp;{notice}</div>}
    {modal === 'client' && <ClientModal onClose={() => setModal(null)} onSave={client => { setStore(current => ({ ...current, clients: [...current.clients, client] })); setModal(null); setNotice('Client ajouté avec succès.'); }}/ >}
    {modal === 'doc' && <DocModal kind={docKind} clients={store.clients} onClose={() => setModal(null)} onSave={doc => { setStore(current => ({ ...current, docs: [...current.docs, doc] })); setModal(null); setNotice(`${doc.kind} créé avec succès.`); }}/ >}
  </main>;
}

function escapeHtml(text: string) { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char)); }
function Stat({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: string; tone: string }) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><strong className="stat-value">{value}</strong><div className="stat-detail"><span className={`status-dot ${tone}`}/>{detail}</div></div>; }
function Search({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder: string }) { return <label className="search-box"><span>⌕</span><input value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder}/><kbd>⌘ K</kbd></label>; }
function EmptyState({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) { return <div className="empty-state"><span>▤</span><strong>{title}</strong><p>{text}</p><button className="primary-button" onClick={onClick}>{action}</button></div>; }
function DocumentTable({ docs, clientFor, onPrint, onStatus, onConvert }: { docs: Doc[]; clientFor: (id: string) => string; onPrint: (doc: Doc) => void; onStatus: (id: string, status: Doc['status']) => void; onConvert: (doc: Doc) => void }) {
  if (!docs.length) return <div className="table-empty">Aucun document à afficher.</div>;
  return <div className="table-scroll"><table className="docs-table"><thead><tr><th>DOCUMENT</th><th>CLIENT</th><th>DATE</th><th>MONTANT TTC</th><th>STATUT</th><th></th></tr></thead><tbody>{docs.map(doc => { const { ht, vat } = totals(doc.lines); return <tr key={doc.id}><td><div className="doc-number"><span className={`doc-icon ${doc.kind === 'Devis' ? 'quote' : 'invoice'}`}>{doc.kind === 'Devis' ? '▤' : '▣'}</span><span><strong>{doc.number}</strong><small>{doc.kind}</small></span></div></td><td>{clientFor(doc.clientId)}</td><td>{dateFr(doc.date)}</td><td className="amount">{money(ht + vat)}</td><td><select className={`status-select ${doc.status.toLowerCase()}`} aria-label={`Statut ${doc.number}`} value={doc.status} onChange={event => onStatus(doc.id, event.target.value as Doc['status'])}>{(doc.kind === 'Devis' ? ['Brouillon', 'Envoyée', 'Accepté'] : ['Brouillon', 'Envoyée', 'Payée']).map(status => <option key={status}>{status}</option>)}</select></td><td><div className="row-actions"><button title="Imprimer ou enregistrer en PDF" onClick={() => onPrint(doc)}>↓</button>{doc.kind === 'Devis' && <button title="Convertir en facture" onClick={() => onConvert(doc)}>↗</button>}</div></td></tr>; })}</tbody></table></div>;
}

function ClientModal({ onClose, onSave }: { onClose: () => void; onSave: (client: Client) => void }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [siren, setSiren] = useState(''); const [address, setAddress] = useState(''); const [lookup, setLookup] = useState(false); const [error, setError] = useState('');
  async function lookupSiren() {
    const clean = siren.replace(/\s/g, '');
    if (!/^\d{9}(\d{5})?$/.test(clean)) { setError('Saisissez un SIREN (9 chiffres) ou un SIRET (14 chiffres).'); return; }
    setLookup(true); setError('');
    try {
      const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(clean)}&per_page=1`);
      if (!response.ok) throw new Error('Recherche indisponible');
      const result = await response.json(); const company = result.results?.[0];
      if (!company) throw new Error('Aucune entreprise trouvée pour ce numéro.');
      setName(company.nom_complet || company nom_complet || company.denomination || name);
      const siege = company.siege || {};
      setAddress([siege.numero_voie, siege.type_voie, siege.libelle_voie, siege.code_postal, siege.libelle_commune].filter(Boolean).join(' '));
      setSiren(company.siren || clean.slice(0, 9));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'La recherche a échoué.'); }
    finally { setLookup(false); }
  }
  return <Modal title="Ajouter un client" subtitle="Complétez les informations de votre client." onClose={onClose}><form onSubmit={event => { event.preventDefault(); if (!name.trim()) { setError('Le nom du client est obligatoire.'); return; } onSave({ id: crypto.randomUUID(), name: name.trim(), email: email.trim(), siren: siren.replace(/\D/g, '').slice(0, 9), address: address.trim() }); }}><label className="field-label">SIREN / SIRET<div className="lookup-row"><input value={siren} onChange={event => setSiren(event.target.value)} placeholder="Ex. 812 345 678"/><button type="button" className="secondary-button" disabled={lookup} onClick={lookupSiren}>{lookup ? 'Recherche…' : 'Vérifier'}</button></div></label><p className="field-hint">Recherche facultative via l’API publique de l’Annuaire des entreprises.</p>{error && <p className="form-error">{error}</p>}<label className="field-label">Nom de l’entreprise<input required value={name} onChange={event => setName(event.target.value)} placeholder="Nom du client"/></label><label className="field-label">Adresse e-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="contact@entreprise.fr"/></label><label className="field-label">Adresse postale<input value={address} onChange={event => setAddress(event.target.value)} placeholder="Adresse complète"/></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button className="primary-button">Enregistrer le client</button></div></form></Modal>;
}

function DocModal({ kind, clients, onClose, onSave }: { kind: 'Devis' | 'Facture'; clients: Client[]; onClose: () => void; onSave: (doc: Doc) => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? ''); const [description, setDescription] = useState(''); const [quantity, setQuantity] = useState('1'); const [unitPrice, setUnitPrice] = useState(''); const [vatRate, setVatRate] = useState('20'); const [error, setError] = useState('');
  const qty = Number(quantity) || 0; const price = Number(unitPrice) || 0; const rate = Number(vatRate) || 0; const ht = qty * price; const vat = ht * rate / 100;
  return <Modal title={`Créer ${kind === 'Devis' ? 'un devis' : 'une facture'}`} subtitle="Ajoutez une prestation et vérifiez les totaux avant enregistrement." onClose={onClose}>{clients.length ? <form onSubmit={event => { event.preventDefault(); if (!clientId || !description.trim() || qty <= 0 || price < 0) { setError('Choisissez un client et renseignez une prestation valide.'); return; } const prefix = kind === 'Devis' ? 'DEV' : 'FAC'; onSave({ id: crypto.randomUUID(), number: `${prefix}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, kind, clientId, date: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), status: 'Brouillon', lines: [{ description: description.trim(), quantity: qty, unitPrice: price, vat: rate }] }); }}><label className="field-label">Client<select required value={clientId} onChange={event => setClientId(event.target.value)}>{clients.map(client => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label><label className="field-label">Description de la prestation<input required value={description} onChange={event => setDescription(event.target.value)} placeholder="Ex. Conseil et accompagnement"/></label><div className="form-grid"><label className="field-label">Quantité<input type="number" min="0.01" step="0.01" value={quantity} onChange={event => setQuantity(event.target.value)}/></label><label className="field-label">Prix unitaire HT (€)<input type="number" min="0" step="0.01" value={unitPrice} onChange={event => setUnitPrice(event.target.value)} placeholder="0,00"/></label><label className="field-label">TVA<select value={vatRate} onChange={event => setVatRate(event.target.value)}><option value="0">0 %</option><option value="5.5">5,5 %</option><option value="10">10 %</option><option value="20">20 %</option></select></label></div><div className="totals-box"><div><span>Total HT</span><strong>{money(ht)}</strong></div><div><span>TVA ({rate} %)</span><strong>{money(vat)}</strong></div><div className="grand-total"><span>Total TTC</span><strong>{money(ht + vat)}</strong></div></div>{error && <p className="form-error">{error}</p>}<div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button className="primary-button">Créer {kind.toLowerCase()}</button></div></form> : <div className="empty-state modal-empty"><span>♙</span><strong>Ajoutez d’abord un client</strong><p>Un client est nécessaire pour créer un document.</p><button className="secondary-button" onClick={onClose}>Fermer</button></div>}</Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" onClick={onClose} aria-label="Fermer">×</button></div>{children}</div></div>; }
