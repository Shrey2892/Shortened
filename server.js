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

    if (!url) {
        return res.status(400).send("URL is required");
    }

    const slug = customSlug || nanoid(7);

    try {
        const result = await pool.query(
            `INSERT INTO links (slug, url, title)
             VALUES ($1, $2, $3) RETURNING *`,
            [slug, url, title || null]
        );

        res.redirect("/");
    } catch (err) {
        console.log(err);
        return res.send("Slug already exists or database error");
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
