import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiOrigin, getInspiration, isNotFoundError } from "@/lib/api";

export default async function InspirationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const result = await getInspiration(id);
    const item = result.data;
    const fileUrl = `${getApiOrigin()}${item.file_url}`;

    return (
      <main className="stack">
        <section className="card stack">
          <Link href="/inspirations">← Back to inspirations</Link>
          <div>
            <h1>{item.title || item.original_filename}</h1>
            <p className="muted">Added {new Date(item.created_at).toLocaleString()}</p>
          </div>
          <img alt={item.title || item.original_filename} className="detail-image" src={fileUrl} />
          <div className="metadata">
            <div>
              <strong>Original filename:</strong> {item.original_filename}
            </div>
            <div>
              <strong>MIME type:</strong> {item.mime_type}
            </div>
            <div>
              <strong>File size:</strong> {item.file_size_bytes} bytes
            </div>
            {item.source_url ? (
              <div>
                <strong>Source URL:</strong>{" "}
                <a href={item.source_url} rel="noreferrer" target="_blank">
                  {item.source_url}
                </a>
              </div>
            ) : null}
            {item.notes ? (
              <div>
                <strong>Notes:</strong> {item.notes}
              </div>
            ) : null}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
