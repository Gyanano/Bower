import Link from "next/link";

export default function HomePage() {
  return (
    <main className="stack">
      <section className="card stack">
        <h1>Bower MVP foundation</h1>
        <p className="muted">
          Local-first upload, save, list, and detail flow for inspiration images.
        </p>
        <div className="nav">
          <Link href="/upload">Upload inspiration</Link>
          <Link href="/inspirations">Browse saved inspirations</Link>
          <Link href="/settings/ai">Configure AI provider</Link>
        </div>
      </section>
    </main>
  );
}
