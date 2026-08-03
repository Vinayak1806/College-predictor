function serializeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    };
  }

  return { name: "UnknownError", message: String(error) };
}

export function logServerError(context, error, metadata = {}) {
  console.error(JSON.stringify({
    level: "error",
    context,
    timestamp: new Date().toISOString(),
    ...metadata,
    error: serializeError(error)
  }));
}

export function publicServerError(message, requestId) {
  return {
    error: message,
    requestId
  };
}

export function createRequestId() {
  return crypto.randomUUID();
}
