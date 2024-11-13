const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();

let db;
const SECRET_KEY = process.env.SECRET_KEY;
const key = Buffer.from(process.env.KEY, "utf8");
const iv = Buffer.from(process.env.IV, "utf8");

const encrypt = (text) => {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

const decrypt = (text) => {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", login);
};

const getFeed = async (req, res) => {
  const query = `SELECT * FROM tweets`;
  const tweets = await queryDB(db, query);
  const decryptedTweets = tweets.map((tweet) => ({
    ...tweet,
    text: decrypt(tweet.text),
  }));
  res.json(decryptedTweets);
};

const postTweet = (req, res) => {
  const { text } = req.body;
  const username = req.user.username;

  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "Text in the tweet is required" });
  }

  const encryptedText = encrypt(text);
  const query = `INSERT INTO tweets (username, timestamp, text) VALUES (?, datetime('now'), ?)`;
  try {
    insertDB(db, query, [username, encryptedText]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ?`;
  const users = await queryDB(db, query, [username]);

  if (users.length === 1) {
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ token });
    } else {
      res.status(401).json({ message: "Invalid password or username" });
    }
  }
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader ? authHeader.split(" ")[1]: null;
  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return
  }
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      res.status(401).json({ message: "Invalid token" });
      return
    }
    req.user = user
    next()
  })
}

module.exports = { initializeAPI };
