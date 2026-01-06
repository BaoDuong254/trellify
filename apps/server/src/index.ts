import express from "express";
const app = express();
const port = 3000;

app.get("/", (_request, response) => {
  response.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${String(port)}`);
});
