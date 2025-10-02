import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";

import uploadRouter from "./routes/upload.js";
import privacyRouter from "./routes/privacy.js";
import aboutRouter from "./routes/about.js";
import viewRouter from "./routes/view.js";
import exprRouter from "./routes/expr.js";
import editRouter from "./routes/edit.js";
import printRouter from "./routes/print.js";
import tagRouter from "./routes/tag.js";

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
app.use('/expr', exprRouter);
app.use('/edit', editRouter);
app.use('/print', printRouter);
app.use('/tag', tagRouter);

{
  const tags = [];
  const tagMap = {};
  const log = (await db.ref(`card-set`).get()).val();
  const keys = Object.keys(log);

  for (const key of keys) {
    const card = log[key]
    if (card.ocr === undefined || card.ocr === "") {
      continue;
    }
    let json = JSON.parse(card.ocr);
    if (json.blocks === undefined) {
      continue;
    }
    for (const block of json.blocks) {
      for (const line of block?.lines) {
        if (line.text === "2025 glitches.me") {
          continue;
        }
        let words = line.text.split(" ");
        words = words.filter(e => e.length >= 4);
        words = words.map(e => e.toLowerCase());
        words = words.map(e => e.replace(/[#,\.\(\)\']/g, ""));
        for (const word of words) {
          if (tagMap[word] === undefined) {
            tagMap[word] = { count: 1, pages: [key] };
          }
          else {
            tagMap[word].count++;
            if (tagMap[word].pages.findIndex(e => e === key) < 0) {
              tagMap[word].pages.push(key);
            }
          }
        }
      }
    }
  }
  for (const key of Object.keys(tagMap)) {
    tags.push({ name: key, count: tagMap[key].count, pages: tagMap[key].pages });
  }
  tags.sort((a, b) => b.count - a.count);
  const ref = await db.ref(`tags`).update(
    tags
  );
}

async function genNextList(start) {
  const N = 10;
  const log = (await db.ref('card-set').get()).val();
  const keys = Object.keys(log).sort((a, b) => log[a].date - log[b].date).reverse();
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
  const tags = (await db.ref('tags').get()).val();
  res.render("pages/index", {
    list: await genNextList(0),
    tags: tags.filter(e => e.count > 2 && e.name !== "naoto"),
    metadata: null,
  });
})

app.get("/next", async (req, res) => {
  const start = req.query.start === undefined ? 0 : parseInt(req.query.start);

  res.render("partials/next", {
    list: await genNextList(start),
    metadata: null,
  });
})

app.get("/workshop", async (req, res) => {
  res.redirect("/");
})

const server = app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

async function runOcr() {
  const log = (await db.ref('card-set').get()).val();
  const pageIds = Object.keys(log);
  for(const pageId of pageIds) {
    if(log[pageId].ocr === undefined || log[pageId].ocr === '') {
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
          const ref = await db.ref(`card-set/${pageId}/ocr`).update(
            JSON.stringify(iaResult.readResult)
          );
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
