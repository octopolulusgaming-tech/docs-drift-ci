import http from "node:http";

const server = http.createServer((request, response) => {
  if (request.url === "/users") {
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        meta: { requestId: `req-${Date.now()}` },
        users: [{ id: "u_1", name: "Ada" }]
      })
    );
    return;
  }

  response.statusCode = 404;
  response.end("not found");
});

server.listen(4010, "127.0.0.1", () => {
  process.stdout.write("Mock server running at http://127.0.0.1:4010\n");
});
