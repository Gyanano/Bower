import { redirect } from "next/navigation";

export default function UploadPage() {
  redirect("/inspirations?compose=1");
}
