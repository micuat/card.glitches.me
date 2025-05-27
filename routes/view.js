import express from "express";

import db from "../db.js";

const router = express.Router();

router.get("/:pageId", async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  const snapshot = await db.ref(`card-set/${pageId}`).get();
  const dataAvailable = snapshot.exists();

  if (dataAvailable) {
    let ocr = "";
    if (snapshot.val().ocr !== undefined && snapshot.val().ocr !== "") {
      let json = JSON.parse(snapshot.val().ocr);
      if (json.blocks !== undefined) {
        for (const block of json.blocks) {
          for (const line of block?.lines) {
            ocr += line.text + " ";
          }
        }
      }
    }

    const morePaths = [];
    if (snapshot.val().morePaths !== undefined) {
      for (let i = 0; i < snapshot.val().morePaths.length; i++) {
        morePaths[i] = snapshot.val().morePaths[i].filenameMid;
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
        morePaths,
      },
    });
  }
  else {
    res.redirect("/upload");
  }
})

export default router;
