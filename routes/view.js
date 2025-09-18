import express from "express";

import db from "../db.js";

const router = express.Router();

const hardCodedLinks = {
  C116: "https://www.youtube.com/embed/EvK910VavdI",
  C118: "https://www.youtube.com/embed/5DIPk4ADGl0",
  C117: "https://www.youtube.com/embed/qYbrkJvvG58",
  C115: "https://www.youtube.com/embed/729pl5ywAnc",
  C119: "https://www.youtube.com/embed/giFkuFGsc74",
  C111: "https://www.youtube.com/embed/sFlCZHM2kEM",
  C112: "https://www.youtube.com/embed/csnNNMsPw2A",
  C120: "https://www.youtube.com/embed/7W4E1JwgvnM",
}

router.get("/:pageId", async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  const snapshot = await db.ref(`card-set/${pageId}`).get();
  const dataAvailable = snapshot.exists();

  if (dataAvailable) {
    const tags = [];
    let ocr = "";
    if (snapshot.val().ocr !== undefined && snapshot.val().ocr !== "") {
      let json = JSON.parse(snapshot.val().ocr);
      if (json.blocks !== undefined) {
        for (const block of json.blocks) {
          for (const line of block?.lines) {
            ocr += line.text + " ";
            if (line.text === "2025 glitches.me") {
              continue;
            }
            let words = line.text.split(" ");
            words = words.filter(e => e.length >= 4);
            words = words.map(e => e.toLowerCase());
            words = words.map(e => e.replace(/[#,\.\(\)\']/g, ""));
            tags.push(...words.map(e => { return { name: e, freq: 1 }}));
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

    let linkView = "";
    if (hardCodedLinks[pageId] !== undefined) {
      linkView = `<iframe class="w-full aspect-[9/16]" src="${hardCodedLinks[pageId]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
    }

    res.render("pages/view", {
      pageId,
      filename: `/uploads/${ snapshot.val().filenameMid }`,
      tags,
      metadata: {
        title: `${ pageId } by ${ snapshot.val().author }`,
        image: `/uploads/${ snapshot.val().filenameMid }`,
        // ocrRaw: JSON.stringify(snapshot.val().ocr),
        ocr,
        morePaths,
        linkView,
      },
    });
  }
  else {
    res.redirect("/upload");
  }
})

export default router;
