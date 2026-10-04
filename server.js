const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public"), {
  extensions: ["html"]
}));

app.get("/health", (req, res) => {
  res.json({ ok: true, app: "AI Video Editor", version: "4.0.0" });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AI Video Editor running on port ${PORT}`);
});
