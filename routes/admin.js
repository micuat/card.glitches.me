import express from "express";

import db from "../db.js";

const router = express.Router();

router.get("/list", async (req, res) => {
  res.render("pages/list", {
    // pageId,
    // filename: `/uploads/${ snapshot.val().filenameMid }`,
    // tags,
    metadata: {
    //   title: `${ pageId } by ${ snapshot.val().author }`,
    //   image: `/uploads/${ snapshot.val().filenameMid }`,
    //   // ocrRaw: JSON.stringify(snapshot.val().ocr),
    //   ocr,
    //   morePaths,
    //   linkView,
    },
  });
})

export default router;
