import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";

import uploadRouter from "./routes/upload.js";
import privacyRouter from "./routes/privacy.js";
import viewRouter from "./routes/view.js";
import editRouter from "./routes/edit.js";
import printRouter from "./routes/print.js";

import db from "./db.js";

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

process.on('SIGINT', function() {
  server.close();
});
