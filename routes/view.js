import express from "express";

import db from "../db.js";

const router = express.Router();

router.get("/:pageId", async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  const snapshot = await db.ref(`card-set/${pageId}`).get();
  const dataAvailable = snapshot.exists();

  if (dataAvailable) {
    let ocr = "";
    for (const block of snapshot.val()?.ocr?.blocks) {
      for (const line of block?.lines) {
        ocr += line.text + " ";
      }
    }

    res.render("pages/view", {
      pageId,
      filename: `/uploads/${ snapshot.val().filenameMid }`,
      metadata: {
        title: `${ pageId } by ${ snapshot.val().author }`,
        image: `/uploads/${ snapshot.val().filenameMid }`,
        // ocrRaw: JSON.stringify(snapshot.val().ocr),
        ocr,
      },
    });
  }
  else {
    res.redirect("/upload");
  }
})

export default router;
