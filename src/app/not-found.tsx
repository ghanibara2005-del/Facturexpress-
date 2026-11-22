import Link from "next/link";

export default function NotFound() {
  return <main style={{ padding: 32 }}><h1>Page introuvable</h1><Link href="/">Retour au tableau de bord</Link></main>;
}
