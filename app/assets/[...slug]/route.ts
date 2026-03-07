import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

const ASSETS_ROOT = path.resolve(process.cwd(), "public/assets");

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

function resolveAssetPath(slug: string[]): string | null {
  const requestedPath = path.resolve(ASSETS_ROOT, ...slug);
  if (!requestedPath.startsWith(ASSETS_ROOT + path.sep) && requestedPath !== ASSETS_ROOT) {
    return null;
  }

  return requestedPath;
}

async function serveAsset(slug: string[]): Promise<NextResponse> {
  const filePath = resolveAssetPath(slug);
  if (!filePath) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  try {
    const [fileBuffer, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);

    if (!fileStats.isFile()) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Type": getContentType(filePath),
      },
    });
  } catch {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  return await serveAsset(slug);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
): Promise<NextResponse> {
  const response = await GET(request, context);
  return new NextResponse(null, {
    headers: response.headers,
    status: response.status,
  });
}
