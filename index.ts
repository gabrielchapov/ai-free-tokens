const server = Bun.serve(
  {
    port: process.env.PORT ?? 3000,
    async fetch(req) {
      return new Response("API de Bun funcionando correctamente");
    },
  }
);

console.log(`Server is running on ${server.url}:${server.port}`)