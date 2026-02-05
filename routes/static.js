import express from "express";

const router = express.Router();

router.get("/meetup", (req, res) => {
  res.render("pages/static/meetup", {
    metadata: null,
  });
})

router.get("/privacy", (req, res) => {
  res.render("pages/static/privacy", {
    metadata: null,
  });
})

router.get("/about", (req, res) => {
  res.render("pages/static/about", {
    metadata: null,
  });
})

export default router;
