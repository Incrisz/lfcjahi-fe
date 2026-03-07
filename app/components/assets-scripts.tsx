import Script from "next/script";
import fs from "fs";
import path from "path";

type AssetsScriptsProps = {
  pageScript: "lfc-library.js" | "lfc-single-message.js";
};

/* ── CDN URLs for standard third-party libraries ── */
const CDN_SCRIPTS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.1/umd/popper.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.6.2/js/bootstrap.min.js",
];

/* ── Custom scripts inlined from public/assets/js at build time ── */
function readScript(filename: string): string {
  const filePath = path.join(process.cwd(), "public", "assets", "js", filename);
  return fs.readFileSync(filePath, "utf-8");
}

const INLINE_CORE = ["asyncloader.min.js", "streamlab-core.js", "script.js", "messages-data.js"] as const;

export default function AssetsScripts({ pageScript }: AssetsScriptsProps) {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");

  return (
    <>
      <Script
        id="lfc-api-base-url"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.lfcApiBaseUrl = ${JSON.stringify(apiBaseUrl)};`,
        }}
      />

      {/* Third-party libraries from CDN */}
      {CDN_SCRIPTS.map((url) => (
        <Script key={url} src={url} strategy="afterInteractive" />
      ))}

      {/* Inline custom core scripts */}
      {INLINE_CORE.map((name) => (
        <Script
          key={name}
          id={`inline-${name.replace(/\./g, "-")}`}
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: readScript(name) }}
        />
      ))}

      {/* Inline page-specific script */}
      <Script
        id={`inline-${pageScript.replace(/\./g, "-")}`}
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: readScript(pageScript) }}
      />
    </>
  );
}
