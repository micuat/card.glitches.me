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

router.post("/", upload.fields([{ name: 'cardimg', maxCount: 1 }, { name: 'moreimg', maxCount: 3 }]),
  async (req, res) => {
  if (!req.files['cardimg'][0]) {
    res.status(400).send('<div>No file uploaded.</div>');
    return;
  }

  const imageRaw = `uploads/${ req.files['cardimg'][0].filename }`;
  const imageMid = `uploads/${ req.files['cardimg'][0].filename }-mid.jpeg`;
  const imageThumb = `uploads/${ req.files['cardimg'][0].filename }-thumb.jpeg`;

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

  try {
    const decoderArgs = process.env.USE_DUMMY_QR_DECODER != 0 ?
      ["./qrdecoder.py", "-d", "https://card.glitches.me/view/A002", "dummyfilename"] :
      ["./qrdecoder.py", imageRaw];
    const stdout = execFileSync("python3", decoderArgs, {
      stdio: "pipe",
      encoding: "utf8",
    });

    // TODO: condition - if no result vs multiple lines
    if (stdout == "") {
      return res.send(`<div class="text-red-400">
        QR code not detected! This may be because the photo is blurry or the QR code is hidden.
        </div>`); // TODO: make it error code
    }

    const stdoutLines = stdout.split("\n").filter(s => s.length > 0);

    if (stdoutLines.length > 1) {
      return res.send(`<div class="text-red-400">
        Multiple QR code detected! Please make sure only one card is in the photo.
        </div>`); // TODO: make it error code
    }

    const pageId = stdoutLines[0].split("https://card.glitches.me/view/")[1];

    if (pageId == null) {
      return res.send(`<div>
        QR code corrupted! Did you really take a photo of the card?
        </div>`); // TODO: make it error code
    }

    const newCard = {
      author: req.body.author,
      filename: req.files['cardimg'][0].filename,
      filenameMid: `${ req.files['cardimg'][0].filename }-mid.jpeg`,
      filenameThumb: `${ req.files['cardimg'][0].filename }-thumb.jpeg`,
      date: Date.now(),
      path: req.files['cardimg'][0].path,
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
    return res.send(`<div>
      Internal error, sorry!
      </div>`); // TODO: make it error code
  }

});

export default router;
