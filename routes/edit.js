import express from "express";

import db from "../db.js";

const router = express.Router();

router.get("/:pageId", async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  const snapshot = await db.ref(`card-set/${pageId}`).get();
  const dataAvailable = snapshot.exists();

  if (dataAvailable) {
    res.render("pages/edit", {
      pageId,
      metadata: null,
    });
  }
  else {
    res.redirect("/upload");
  }
})

export default router;
