import { redirect } from "next/navigation";

export default async function InspirationDetailRedirectPage({ params }: PageProps<"/inspirations/[id]">) {
  const { id } = await params;
  redirect(`/inspirations?selected=${id}`);
}
