import express from 'express'
const app = express()
const port = 3000

app.set('view engine', 'ejs');

app.use("/public", express.static('public'))

app.get('/', (req, res) => {
  res.render('pages/index');
})

app.get('/view/:pageId', (req, res) => {
  res.send('view' + req.params.pageId)
})

app.get('/print/:pageId', (req, res) => {
  res.render('pages/print', {
    pageId: req.params.pageId
  });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
   