import Script from "next/script";

type AssetsScriptsProps = {
  pageScript: "lfc-library.js" | "lfc-single-message.js";
};

const coreScripts = [
  "jquery-3.6.0.min.js",
  "asyncloader.min.js",
  "bootstrap.min.js",
  "popper.min.js",
  "streamlab-core.js",
  "script.js",
  "messages-data.js",
] as const;

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
      {coreScripts.map((scriptName) => (
        <Script
          key={scriptName}
          src={`/assets/js/${scriptName}`}
          strategy="afterInteractive"
        />
      ))}
      <Script src={`/assets/js/${pageScript}`} strategy="afterInteractive" />
    </>
  );
}
