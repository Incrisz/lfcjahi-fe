import Script from "next/script";

type AssetsScriptsProps = {
  pageScript: "lfc-library.js" | "lfc-single-message.js";
};

const VENDOR_SCRIPTS = ["jquery-3.6.0.min.js", "popper.min.js", "bootstrap.min.js"] as const;
const CORE_SCRIPTS = ["asyncloader.min.js", "streamlab-core.js", "script.js", "messages-data.js"] as const;

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

      {/* Vendor scripts in dependency order */}
      {VENDOR_SCRIPTS.map((name) => (
        <Script
          key={name}
          id={`asset-${name.replace(/\./g, "-")}`}
          strategy="beforeInteractive"
          src={`/lfc-assets/js/${name}`}
        />
      ))}

      {/* Core scripts after React hydration */}
      {CORE_SCRIPTS.map((name) => (
        <Script
          key={name}
          id={`asset-${name.replace(/\./g, "-")}`}
          strategy="afterInteractive"
          src={`/lfc-assets/js/${name}`}
        />
      ))}

      {/* Page-specific script */}
      <Script
        id={`asset-${pageScript.replace(/\./g, "-")}`}
        strategy="afterInteractive"
        src={`/lfc-assets/js/${pageScript}`}
      />
    </>
  );
}
