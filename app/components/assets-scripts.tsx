import Script from "next/script";
import fs from "fs";
import path from "path";

type AssetsScriptsProps = {
  pageScript: "lfc-library.js" | "lfc-single-message.js";
};

/* ── Custom scripts inlined from public/assets/js at build time ── */
function readScript(filename: string): string {
  const filePath = path.join(process.cwd(), "public", "assets", "js", filename);
  return fs.readFileSync(filePath, "utf-8");
}

const INLINE_VENDOR = ["jquery-3.6.0.min.js", "popper.min.js", "bootstrap.min.js"] as const;
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

      {/* Inline vendor scripts in dependency order */}
      {INLINE_VENDOR.map((name) => (
        <Script
          key={name}
          id={`inline-${name.replace(/\./g, "-")}`}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: readScript(name) }}
        />
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
