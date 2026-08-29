import "server-only";

const DEVELOPMENT_APP_ORIGIN = "http://localhost:3000";

function configurationError(message: string): never {
  throw new Error(`Server configuration error: ${message}`);
}

export function getAppOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();

  if (!configuredOrigin) {
    if (process.env.NODE_ENV !== "production") {
      return DEVELOPMENT_APP_ORIGIN;
    }

    return configurationError("APP_ORIGIN is required in production.");
  }

  let url: URL;

  try {
    url = new URL(configuredOrigin);
  } catch {
    return configurationError("APP_ORIGIN must be a valid absolute URL.");
  }

  if (url.username || url.password) {
    return configurationError("APP_ORIGIN must not contain credentials.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    return configurationError(
      "APP_ORIGIN must contain only an origin without a path, query, or hash.",
    );
  }

  const isDevelopmentLoopback =
    process.env.NODE_ENV !== "production" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  const hasAllowedProtocol =
    url.protocol === "https:" ||
    (url.protocol === "http:" && isDevelopmentLoopback);

  if (!hasAllowedProtocol) {
    return configurationError(
      "APP_ORIGIN must use HTTPS, except for localhost development over HTTP.",
    );
  }

  return url.origin;
}
