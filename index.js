import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";

import uploadRouter from "./routes/upload.js";
import privacyRouter from "./routes/privacy.js";
import aboutRouter from "./routes/about.js";
import viewRouter from "./routes/view.js";
import editRouter from "./routes/edit.js";
import printRouter from "./routes/print.js";

import db from "./db.js";

import { default as ImageAnalysisClient } from "@azure-rest/ai-vision-image-analysis";
import { default as ImageAnalysis } from "@azure-rest/ai-vision-image-analysis";
import { AzureKeyCredential } from "@azure/core-auth";

const createClient = ImageAnalysis.default;

{
  const snapshot = await db.ref('card-set').get();
  let log = snapshot.val();
  if (log === null) {
    console.log("no data found");
  }
  else {
    console.log("data found:", log);
  }
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

app.use('/privacy', privacyRouter);
app.use('/about', aboutRouter);
app.use('/upload', uploadRouter);
app.use('/view', viewRouter);
app.use('/edit', editRouter);
app.use('/print', printRouter);

async function genNextList(start) {
  const N = 10;
  const log = (await db.ref('card-set').get()).val();
  const keys = Object.keys(log).reverse();
  const files = keys.slice(start, start + N).map(function (key) {
    return {
      pageId: key,
      filename: `/uploads/${ log[key].filenameMid }`,
      author: log[key].author,
    }
  });
  const next = start + N;
  return {
    files: files,
    next,
    more: next < keys.length,
  }
}

app.get("/", async (req, res) => {
  res.render("pages/index", {
    list: await genNextList(0),
    metadata: null,
  });
})

app.get("/next", async (req, res) => {
  const start = req.query.start === undefined ? 0 : parseInt(req.query.start);

  res.render("pages/next", {
    list: await genNextList(start),
    metadata: null,
  });
})

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function runOcr() {
  const log = (await db.ref('card-set').get()).val();
  const pageIds = Object.keys(log);
  for(const pageId of pageIds) {
    if(log[pageId].ocr === undefined) {
      console.log(`run ocr on ${pageId}`);

      const endpoint = process.env['VISION_ENDPOINT'];
      const key = process.env['VISION_KEY'];

      const credential = new AzureKeyCredential(key);
      const client = createClient(endpoint, credential);

      const features = [
        'Read'
      ];

      const imageUrl = 'https://card.glitches.me/' + log[pageId].path;
      console.log(imageUrl)

      async function analyzeImageFromUrl() {
        const result = await client.path('/imageanalysis:analyze').post({
          body: {
              url: imageUrl
          },
          queryParameters: {
              features: features
          },
          contentType: 'application/json'
        });

        const iaResult = result.body;
        console.log(iaResult);
        if (iaResult.readResult) {
          const ref = await db.ref(`card-set/${pageId}/ocr`).update(iaResult.readResult);
          iaResult.readResult.blocks.forEach(block => {
            block.lines.forEach(line => {
              console.log(line.text);
            });
          });
        }
      }

      analyzeImageFromUrl();

      break;
    }
  };
}

runOcr();

setInterval(() => {
  runOcr();
}, 1000 * 60);

process.on('SIGINT', function() {
  server.close();
});
