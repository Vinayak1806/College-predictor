export function json(data, init) {
  return new Response(
    JSON.stringify(data, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
    {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      }
    }
  );
}
