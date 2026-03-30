import { UploadForm } from "@/components/upload-form";

export default function UploadPage() {
  return (
    <main className="stack">
      <section className="card stack">
        <div>
          <h1>Upload inspiration</h1>
          <p className="muted">Supported formats: PNG, JPEG, WEBP.</p>
        </div>
        <UploadForm />
      </section>
    </main>
  );
}
