import Link from "next/link";
import { notFound } from "next/navigation";
import { getApiOrigin, getInspiration, isNotFoundError } from "@/lib/api";
import { InspirationActions } from "@/components/inspiration-actions";

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
              <p className="muted">Status: {item.status}</p>
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
              <div>
                <strong>Last updated:</strong> {new Date(item.updated_at).toLocaleString()}
              </div>
              {item.archived_at ? (
                <div>
                  <strong>Archived at:</strong> {new Date(item.archived_at).toLocaleString()}
                </div>
              ) : null}
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
            {item.analysis_summary ? (
              <div className="stack">
                <div>
                  <strong>AI summary:</strong> {item.analysis_summary}
                </div>
                <div>
                  <strong>AI tags:</strong> {item.analysis_tags.join(", ")}
                </div>
                {item.analyzed_at ? (
                  <div>
                    <strong>Analyzed at:</strong> {new Date(item.analyzed_at).toLocaleString()}
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
          </section>
          <InspirationActions item={item} />
        </main>
      );
  } catch (error) {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  }
}
