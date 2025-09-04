import express from "express";
import QRCode from "qrcode";

const router = express.Router();

router.get("/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  QRCode.toString(`https://card.glitches.me/view/${ pageId }`, { type: "svg" }, function (err, string) {
    if (err) throw err
    res.render("pages/print", {
      pageId,
      qrcode: string.replace(/<\/?svg[^>]*>/g, "").replace(/<path fill[^>]*>/g, ""),
      metadata: null,
    });
  });
})

router.get("/double/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  if (pageId.length != 4) {
    res.status(400).send('<div>page id not valid</div>');
    return;
  }
  const pageCode = pageId[0];
  const pageStart = parseInt(pageId.slice(1));
  const nextPageId = pageCode + String(pageStart+1).padStart(3, '0');
  QRCode.toString(`https://card.glitches.me/view/${ pageId }`, { type: "svg" }, function (err, string) {
    if (err) throw err
    res.render("pages/print-double", {
      pageId,
      nextPageId,
      qrcode: string.replace(/<\/?svg[^>]*>/g, "").replace(/<path fill[^>]*>/g, ""),
      metadata: null,
    });
  });
})


router.get("/batch/:pageId", async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  if (pageId.length != 4) {
    res.status(400).send('<div>page id not valid</div>');
    return;
  }
  const pageCode = pageId[0];
  const pageStart = parseInt(pageId.slice(1));
  const nextPageId = pageCode + String(pageStart+10).padStart(3, '0');

  const pages = [];
  let page = pageStart;

  let str;
  for (let i = 0; i < 2; i++) {
    pages[i] = [];
    for (let j = 0; j < 5; j++) {
      const curPageId = pageCode + String(page).padStart(3, '0');
      str = await QRCode.toString(`https://card.glitches.me/view/${ curPageId }`, { type: "svg" });
      str = str.replace(/<\/?svg[^>]*>/g, "").replace(/<path fill[^>]*>/g, "");
      pages[i][j] = {
        pageId: curPageId,
        qrcode: str,
      };
      page++;
    }
  }

  res.render("pages/print-batch", {
    pageId,
    nextPageId,
    pages,
    metadata: null,
  });


})

export default router;
