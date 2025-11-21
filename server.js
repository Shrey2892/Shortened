require("dotenv").config();
const express = require("express");
const pool = require("./db");
const { nanoid } = require("nanoid");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Set view engine
app.set("view engine", "ejs");

// ---------------------------
// 1️⃣ HOME PAGE
// ---------------------------
app.get("/", async (req, res) => {
    const links = await pool.query("SELECT * FROM links ORDER BY created_at DESC");
    res.render("index", { links: links.rows, base: process.env.BASE_URL });
});

// ---------------------------
// 2️⃣ SHORTEN URL
// ---------------------------
app.post("/shorten", async (req, res) => {
  const { url, customSlug, title } = req.body;
  const slug = customSlug || nanoid(6);

  try {
    await pool.query(
      "INSERT INTO links (url, slug, title) VALUES ($1, $2, $3)",
      [url, slug, title]
    );
    res.redirect("/");
  } catch (error) {
    if (error.code === "23505") {
      res.send("❌ Slug already exists. Try another one!");
    } else {
      console.error(error);
      res.send("❌ Database error occurred. Please try again.");
    }
  }
});

// ---------------------------
// 3️⃣ REDIRECT SHORT URL
// ---------------------------
app.get("/:slug", async (req, res) => {
    const slug = req.params.slug;

    const result = await pool.query(`SELECT * FROM links WHERE slug = $1`, [slug]);

    if (result.rows.length === 0) {
        return res.status(404).send("Link not found");
    }

    const link = result.rows[0];

    await pool.query(
        `UPDATE links SET clicks = clicks + 1, last_accessed = now() WHERE slug = $1`,
        [slug]
    );

    res.redirect(link.url);
});

// ---------------------------
// 4️⃣ DELETE LINK
// ---------------------------
app.post("/delete/:id", async (req, res) => {
    const id = req.params.id;
    await pool.query(`DELETE FROM links WHERE id = $1`, [id]);
    res.redirect("/");
});

// ---------------------------
app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
);
