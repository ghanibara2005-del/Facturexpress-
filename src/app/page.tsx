import Link from "next/link";

const menu = [
  ["Tableau de bord", "/"], ["Clients", "/clients"], ["Devis", "/devis"], ["Factures", "/factures"]
];

export default function Dashboard() {
  return (
    <main style={{ minHeight: "100vh", display: "flex" }}>
      <aside style={{ width: 230, background: "#172033", color: "white", padding: 24 }}>
        <h2 style={{ margin: "0 0 32px" }}>FactureXpress</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          {menu.map(([label, href]) => <Link key={href} href={href} style={{ color: "white", textDecoration: "none", padding: "10px 12px", borderRadius: 8 }}>{label}</Link>)}
        </nav>
      </aside>
      <section style={{ flex: 1, padding: 32 }}>
        <h1>Tableau de bord</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginTop: 24 }}>
          {[["Chiffre d'affaires", "0 €"], ["Factures en attente", "0"], ["Devis", "0"], ["Clients", "0"]].map(([label, value]) => (
            <article key={label} style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 4px 16px rgba(0,0,0,.06)" }}><small>{label}</small><h2>{value}</h2></article>
          ))}
        </div>
      </section>
    </main>
  );
}
