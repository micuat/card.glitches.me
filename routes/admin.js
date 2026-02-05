import express from "express";

import db from "../db.js";

const router = express.Router();

async function genList() {
  const log = (await db.ref('card-set').get()).val();
  const keys = Object.keys(log).sort((a, b) => log[a].date - log[b].date)
  const files = [];
  const parentNodes = {};
  let lastEvent = {};
  let lastEventDate = 0;

  for (const pageId of keys) {
    const snapshot = await db.ref(`card-set/${pageId}`).get();
    const dataAvailable = snapshot.exists();

    let date = log[pageId].date;
    let title = "";
    let ocr = "";
    let parent = null;
    let parentEvent = null;
    if (dataAvailable) {
      if (date - lastEventDate > 1 * 24 * 60 * 60 * 1000) {
        // more than a day has passed
        lastEventDate = date;
        lastEvent = { pageId, date };
      }
      else {
        parentEvent = lastEvent;
      }

      const tags = [];
      if (snapshot.val().ocr !== undefined && snapshot.val().ocr !== "") {
        let json = JSON.parse(snapshot.val().ocr);
        if (json.blocks !== undefined) {
          for (const block of json.blocks) {
            for (const line of block?.lines) {
              if (title === "") {
                title = line.text.replace(/"/g, '');
                let titleShrunk = title.toLowerCase().replace(/\s/g, '');
                if (parentNodes[titleShrunk] !== undefined) {
                  parent = parentNodes[titleShrunk];
                }
                parentNodes[titleShrunk] = { pageId, date };
              }
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
    }

    files.push({
      pageId,
      date,
      parent,
      parentEvent,
      filename: `${ log[pageId].filenameThumb }`,
      author: log[pageId].author,
      title,
      ocr,
    });
  };
  return {
    files: files,
  }
}

router.get("/list", async (req, res) => {
  res.render("pages/admin/list", {
    list: await genList(),
    metadata: null,
  });
})

export default router;
