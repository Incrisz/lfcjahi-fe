"use client";

import { useParams } from "next/navigation";
import MediaForm from "../../media-form";

export default function AdminEditMediaPage() {
  const params = useParams<{ id: string }>();
  const mediaId = Array.isArray(params.id) ? params.id[0] : params.id;

  return <MediaForm mediaId={mediaId} />;
}
