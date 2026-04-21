import http from "node:http";

const usersPayload = JSON.stringify({
  meta: { requestId: `req-${Date.now()}` },
  users: [{ id: "u_1", name: "Ada" }]
});

const server = http.createServer((request, response) => {
  if (request.url === "/users") {
    response.setHeader("content-type", "application/json");
    response.end(usersPayload);
    return;
  }

  if (request.url === "/redirect/users") {
    response.statusCode = 302;
    response.setHeader("location", "/users");
    response.end();
    return;
  }

  response.statusCode = 404;
  response.end("not found");
});

server.listen(4020, "127.0.0.1", () => {
  process.stdout.write("Mock server running at http://127.0.0.1:4020\n");
});
