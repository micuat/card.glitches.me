import express from "express";
import sharp from "sharp";
import multer from "multer";

import { execFileSync } from "node:child_process";

import db from "../db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.get("/", (req, res) => {
  res.render("pages/upload", {
    metadata: null,
  });
})

async function compressImage(file) {
  if (!file) {
    return;
  }

  const imageRaw = `uploads/${ file.filename }`;
  const imageMid = `uploads/${ file.filename }-mid.jpeg`;
  const imageThumb = `uploads/${ file.filename }-thumb.jpeg`;

  await sharp(imageRaw)
  .rotate()
  .resize(720)
  .toFile(imageMid, (err, info) => {
    console.log(err, info);
  });

  await sharp(imageRaw)
  .rotate()
  .resize(360)
  .toFile(imageThumb, (err, info) => {
    console.log(err, info);
  });

  return {
    filename: file.filename,
    filenameMid: `${ file.filename }-mid.jpeg`,
    filenameThumb: `${ file.filename }-thumb.jpeg`,
  };
}

router.post("/", upload.fields([{ name: 'cardimg', maxCount: 1 }, { name: 'moreimg', maxCount: 3 }]),
  async (req, res) => {
  if (!req.body.author) {
    res.status(400).send('<div class="text-red-400">Please provide author name.</div>');
    return;
  }

  if (!req.files['cardimg'] || !req.files['cardimg'][0]) {
    res.status(400).send('<div class="text-red-400">No file uploaded.</div>');
    return;
  }
  const cardPaths = await compressImage(req.files['cardimg'][0]);
  const morePaths = [];

  if (req.files['moreimg']) {
    for (let i = 0; i < req.files['moreimg'].length; i++) {
      morePaths[i] = await compressImage(req.files['moreimg'][i]);
    }
  }
  console.log(morePaths)

  try {
    const decoderArgs = process.env.USE_DUMMY_QR_DECODER != 0 ?
      ["./qrdecoder.py", "-d", "https://card.glitches.me/view/A002", "dummyfilename"] :
      ["./qrdecoder.py", `uploads/${ cardPaths.filename }`];
    const stdout = execFileSync("python3", decoderArgs, {
      stdio: "pipe",
      encoding: "utf8",
    });

    // TODO: condition - if no result vs multiple lines
    if (stdout == "") {
      return res.status(400).send(`<div class="text-red-400">
        QR code not detected! This may be because the photo is blurry or the QR code is hidden.
        </div>`);
    }

    const stdoutLines = stdout.split("\n").filter(s => s.length > 0);

    if (stdoutLines.length > 1) {
      return res.status(400).send(`<div class="text-red-400">
        Multiple QR code detected! Please make sure only one card is in the photo.
        </div>`);
    }

    const pageId = stdoutLines[0].split("https://card.glitches.me/view/")[1];

    if (pageId == null) {
      return res.status(400).send(`<div>
        QR code corrupted! Did you really take a photo of the card?
        </div>`);
    }

    const newCard = {
      author: req.body.author,
      filename: req.files['cardimg'][0].filename,
      filenameMid: `${ req.files['cardimg'][0].filename }-mid.jpeg`,
      filenameThumb: `${ req.files['cardimg'][0].filename }-thumb.jpeg`,
      date: Date.now(),
      path: req.files['cardimg'][0].path,
      morePaths,
    };
    const ref = await db.ref(`card-set/${pageId}`).update(newCard);
    return res.send(`<div>
      <img class="w-8 inline" src="/uploads/${ req.files['cardimg'][0].filename }-thumb.jpeg">
      #${pageId} by ${req.body.author} added! <a class="underline" href="/view/${ pageId }">View</a>
      </div>`);
  } catch (err) {
    if (err.code) {
      console.error(err.code);
    } else {
      const { stdout, stderr } = err;
      console.error({ stdout, stderr });
    }
    return res.status(500).send(`<div>
      Internal error, sorry!
      </div>`);
  }

});

export default router;
