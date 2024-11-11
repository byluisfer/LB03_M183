const { initializeDatabase, queryDB, insertDB } = require("./database");
const jwt = require("jsonwebtoken");

let db;
const SECRET_KEY = "SHsj3h8s3&vhgto3d8";

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", getFeed, authenticateToken);
  app.post("/api/feed", postTweet, authenticateToken);
  app.post("/api/login", login);
};

const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  const user = await queryDB(db, query);
  if (user.length === 1) {
    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
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
