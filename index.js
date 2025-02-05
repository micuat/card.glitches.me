import "dotenv/config";

import express from "express";
import QRCode from "qrcode";
import bodyParser from "body-parser";
import multer from "multer";
import sharp from "sharp";

import { execFileSync } from "node:child_process";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });
import db from "./db.js";

const snapshot = await db.ref('card-set').get();
let log = snapshot.val();
if (log === null) {
  console.log("no data found");
  log = {};
}
else {
  console.log("data loaded", log);
}

const app = express()
const port = process.env.PORT;

app.set("view engine", "ejs");
app.use(express.json());
// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use("/public", express.static("public"))
app.use("/uploads", express.static("uploads"))

app.get("/", (req, res) => {
  res.render("pages/index", {
    files: Object.keys(log).map(function (key) {
      return {
        pageId: key,
        filename: log[key].filenameMid,
      }
    })
  });
})

app.get("/view/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  const dataAvailable = log[pageId] !== undefined;

  if (dataAvailable) {
    res.render("pages/view", {
      pageId,
      filename: log[pageId].filenameMid,
    });
  }
  else {
    res.render("pages/edit", { pageId });
  }
})

app.get("/edit/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();

  res.render("pages/edit", { pageId });
})

app.get("/print/:pageId", (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  QRCode.toString(`https://card.glitches.me/view/${ pageId }`, { type: "svg" }, function (err, string) {
    if (err) throw err
    res.render("pages/print", {
      pageId,
      qrcode: string.replace(/<\/?svg[^>]*>/g, "").replace(/<path fill[^>]*>/g, ""),
    });
  });
})

app.post("/upload/:pageId", upload.single('cardimg'), async (req, res) => {
  const pageId = req.params.pageId.toUpperCase();
  if (!req.file) {
    res.status(400).send('<div>No file uploaded.</div>');
    return;
  }

  const imageRaw = `uploads/${req.file.filename}`;
  const imageMid = `uploads/${ req.file.filename }-mid.jpeg`;
  const imageThumb = `uploads/${ req.file.filename }-thumb.jpeg`;

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
    const decoderArgs = process.env.USE_DUMMY_QR_DECODER ?
      ["qrdecoder.py", "-d", "https://card.glitches.me/view/A002", "dummyfilename"] :
      ["qrdecoder.py", imageRaw];
    const stdout = execFileSync("python3", decoderArgs, {
      stdio: "pipe",
      encoding: "utf8",
    });

    console.log("qr result", stdout);
    // TODO: condition - if no result vs multiple lines

    const newCard = {
      author: req.body.author,
      filename: req.file.filename,
      filenameMid: `${ req.file.filename }-mid.jpeg`,
      filenameThumb: `${ req.file.filename }-thumb.jpeg`,
      date: Date.now(),
      path: req.file.path,
    };
    log[pageId] = newCard;
    const ref = await db.ref('card-set').set(log);
    return res.send(`<div>
      New card by ${req.body.author} added! <a href="/view/${ pageId }">View the card</a>
      </div>`);
  } catch (err) {
    if (err.code) {
      console.error(err.code);
    } else {
      const { stdout, stderr } = err;
      console.error({ stdout, stderr });
    }
    return res.send(`<div>
      QR code not detected
      </div>`); // TODO: make it error code
  }

});

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

process.on('SIGINT', function() {
  server.close();
});
