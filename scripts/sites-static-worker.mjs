function acceptsHtml(request) {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

const staticWorker = {
  async fetch(request, env) {
    if (!env?.ASSETS?.fetch) return new Response("Static assets are unavailable", { status: 503 });

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || (request.method !== "GET" && request.method !== "HEAD")) return response;

    const url = new URL(request.url);
    const leaf = url.pathname.split("/").pop() ?? "";
    if (!acceptsHtml(request) || leaf.includes(".")) return response;

    url.pathname = "/index.html";
    url.search = "";
    return env.ASSETS.fetch(new Request(url, { method: request.method, headers: request.headers }));
  },
};

export default staticWorker;
