import Link from "next/link";
import { getInspirations } from "@/lib/api";

export default async function InspirationsPage() {
  const result = await getInspirations();

  return (
    <main className="stack">
      <section className="card stack">
        <div>
          <h1>Saved inspirations</h1>
          <p className="muted">Total saved: {result.meta.total}</p>
        </div>

        {result.data.length === 0 ? (
          <p className="muted">No inspirations saved yet.</p>
        ) : (
          <div className="grid">
            {result.data.map((item) => (
              <Link className="card stack" href={`/inspirations/${item.id}`} key={item.id}>
                <div>
                  <strong>{item.title || item.original_filename}</strong>
                </div>
                <div className="muted">{item.original_filename}</div>
                <div className="muted">{item.mime_type}</div>
                <div className="muted">{new Date(item.created_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
