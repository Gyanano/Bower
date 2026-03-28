import Link from "next/link";
import { getApiErrorMessage, getInspirations } from "@/lib/api";

export default async function InspirationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const status = resolvedSearchParams?.status === "archived" ? "archived" : "active";
  let result: Awaited<ReturnType<typeof getInspirations>>;

  try {
    result = await getInspirations(status);
  } catch (error) {
    return (
      <main className="stack">
        <section className="card stack">
          <div>
            <h1>Saved inspirations</h1>
            <p className="muted">Could not load inspirations right now.</p>
          </div>
          <p className="muted">{getApiErrorMessage(error)}</p>
          <Link href="/upload">Try uploading a new inspiration</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="stack">
      <section className="card stack">
        <div>
          <h1>{status === "archived" ? "Archived inspirations" : "Saved inspirations"}</h1>
          <p className="muted">Total {status}: {result.meta.total}</p>
        </div>

        <div className="tabs">
          <Link className={status === "active" ? "tab tab-active" : "tab"} href="/inspirations">
            Active
          </Link>
          <Link className={status === "archived" ? "tab tab-active" : "tab"} href="/inspirations?status=archived">
            Archived
          </Link>
        </div>

        {result.data.length === 0 ? (
          <p className="muted">
            {status === "archived" ? "No archived inspirations yet." : "No active inspirations saved yet."}
          </p>
        ) : (
          <div className="grid">
            {result.data.map((item) => (
              <Link className="card stack" href={`/inspirations/${item.id}`} key={item.id}>
                <div>
                  <strong>{item.title || item.original_filename}</strong>
                </div>
                <div className="muted">{item.original_filename}</div>
                <div className="muted">{item.mime_type}</div>
                <div className="muted">Status: {item.status}</div>
                <div className="muted">{new Date(item.created_at).toLocaleString()}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
