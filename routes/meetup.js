import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("pages/meetup", {
    metadata: null,
  });
})

export default router;
