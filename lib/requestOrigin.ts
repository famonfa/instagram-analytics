export function resolveRequestOrigin(request: Request | { url: string; headers: Headers }): string {
  const url = new URL(request.url);

  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  const hostFromHeader = forwardedHost
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);
  const protoFromHeader = forwardedProto
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL;
  let renderUrl: URL | undefined;
  if (renderExternalUrl) {
    try {
      renderUrl = new URL(renderExternalUrl);
    } catch (error) {
      console.warn(
        "Invalid RENDER_EXTERNAL_URL value; falling back to request origin",
        renderExternalUrl,
        error
      );
    }
  }

  const host =
    hostFromHeader ||
    process.env.RENDER_EXTERNAL_HOSTNAME ||
    renderUrl?.host ||
    url.host;

  const protocol =
    protoFromHeader ||
    renderUrl?.protocol.replace(":", "") ||
    url.protocol.replace(":", "") ||
    (host?.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
