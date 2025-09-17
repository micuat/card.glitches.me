import express from "express";

import db from "../db.js";

const router = express.Router();

router.get("/:tag", async (req, res) => {
  const tag = req.params.tag.toLowerCase();

  const tags = (await db.ref('tags').get()).val();
  const index = tags.findIndex(e => e.name === tag);

  let message = "";
  let list = [];

  if (index < 0) {
    res.render("pages/tag", {
      tag,
      message: "tag not found",
      list,
      metadata: null,
    });
    return;
  }

  const cards = tags[index]?.pages.reverse();

  for (const pageId of cards) {
    const snapshot = await db.ref(`card-set/${pageId}`).get();
    const dataAvailable = snapshot.exists();

    if (dataAvailable) {
      list.push({
        pageId,
        filename: `/uploads/${ snapshot.val().filenameMid }`
      });
    }

  }

  res.render("pages/tag", {
    tag,
    message,
    list,
    metadata: null,
  });
})

export default router;
