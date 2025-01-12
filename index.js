import express from "express";
import QRCode from "qrcode";

const app = express()
const port = 3000

app.set("view engine", "ejs");

app.use("/public", express.static("public"))

app.get("/", (req, res) => {
  res.render("pages/index");
})

app.get("/view/:pageId", (req, res) => {
  res.send("view" + req.params.pageId)
})

app.get("/print/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  QRCode.toString(`https://card.glitches.me/view/${ pageId }`, { type: "svg" }, function (err, string) {
    if (err) throw err
    res.render("pages/print", {
      pageId,
      qrcode: string.replace(/<\/?svg[^>]*>/g, "").replace(/<path fill[^>]*>/g, ""),
    });
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
   