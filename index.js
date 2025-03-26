const express = require('express');
const app = express();

require('dotenv').config();
const SECRET_KEY = process.env.SECRET_KEY;

const cors = require('cors');
app.use(cors());

app.use(express.json())
const PORT = 3000;

const bcrypt = require('bcrypt'); // bcrypt 모듈 추가
const saltRounds = 10;

const jwt = require('jsonwebtoken'); // JWT 모듈 추가

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('인증 헤더 없음');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send('토큰 검증 실패');
    }

    // 인증 성공 시 decoded 안에 있는 사용자 정보 req에 저장
    req.user = decoded;
    next(); // 다음 미들웨어 or 라우터로
  });
}

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", authMiddleware, (req, res) => {
  const { title, content } = req.body;
  const user_id = req.user.user_id; // 로그인한 유저의 ID
  db.run(
    `INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)`,
    [title, content, user_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, title, content, user_id });
    }
  );
});
app.get('/articles', (req, res) => {
  db.all(`
    SELECT articles.*, users.email 
    FROM articles 
    JOIN users ON articles.user_id = users.id
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/articles/:id', (req, res) => {
  let id = req.params.id;

  db.get(`
    SELECT articles.*, users.email 
    FROM articles 
    JOIN users ON articles.user_id = users.id
    WHERE articles.id = ?
  `, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "데이터가 없습니다." });
    }
    res.json(row);
  });
});

app.delete("/articles/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const requestUserId = req.user.user_id; // Get the logged-in user's ID

  // First, check if the article exists and belongs to the logged-in user
  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!article) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // Check if the logged-in user is the author of the article
    if (article.user_id !== requestUserId) {
      return res.status(403).json({ error: "본인의 글만 삭제할 수 있습니다." });
    }

    // Proceed with deleting the article if it belongs to the user
    db.run('DELETE FROM articles WHERE id = ?', [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '게시글이 삭제되었습니다.' });
    });
  });
});

app.put('/articles/:id', authMiddleware, (req, res) => {
  const id = req.params.id;
  const { title, content } = req.body;
  const requestUserId = req.user.user_id; // Get the logged-in user's ID

  // First, check if the article exists and belongs to the logged-in user
  db.get('SELECT * FROM articles WHERE id = ?', [id], (err, article) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!article) {
      return res.status(404).json({ error: "게시글을 찾을 수 없습니다." });
    }

    // Check if the logged-in user is the author of the article
    if (article.user_id !== requestUserId) {
      return res.status(403).json({ error: "본인의 글만 수정할 수 있습니다." });
    }

    // Proceed with updating the article if it belongs to the user
    const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
    db.run(sql, [title, content, id], function (err) {
      if (err) {
        console.error('업데이트 에러:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
    });
  });
});

app.post("/articles/:id/comment", authMiddleware, (req, res) => {
  let articleId = req.params.id;
  let content = req.body.content;
  let user_id = req.user.user_id; // 로그인한 유저의 ID

  if (!content) {
      return res.status(400).json({ error: "Content is required" });
  }

  db.run(
      "INSERT INTO comments (content, article_id, user_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [content, articleId, user_id],
      function (err) {
          if (err) {
              return res.status(500).json({ error: err.message });
          }
          res.json({ 
              message: "Comment added successfully", 
              comment_id: this.lastID 
          });
      }
  );
});

app.get("/articles/:id/comment", (req, res) => {
  let articleId = req.params.id;
  
  db.all(`
    SELECT comments.*, users.email 
    FROM comments 
    JOIN users ON comments.user_id = users.id 
    WHERE comments.article_id = ?
  `, [articleId], (err, rows) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      res.json(rows);
  });
});

app.post("/users", (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
  }

  // 비밀번호 해싱 후 저장
  bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
          return res.status(500).json({ error: "Password encryption failed" });
      }

      db.run("INSERT INTO users (email, password) VALUES (?, ?)", [email, hash], function (err) {
          if (err) {
              if (err.message.includes("UNIQUE constraint failed")) {
                  return res.status(400).json({ error: "Email already in use" });
              }
              return res.status(500).json({ error: err.message });
          }
          res.json({ message: "User registered successfully", user_id: this.lastID });
      });
  });
});

app.post("/login", (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
  }

  // 이메일 확인
  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
      if (err) {
          return res.status(500).json({ error: err.message });
      }
      if (!user) {
          return res.status(404).json({ error: "이메일이 존재하지 않습니다." });
      }

      // 비밀번호 확인 (해싱된 값과 비교)
      bcrypt.compare(password, user.password, (err, result) => {
          if (err) {
              return res.status(500).json({ error: "Password verification failed" });
          }
          if (!result) {
              return res.status(400).json({ error: "비밀번호가 틀립니다." });
          }

          // JWT 토큰 생성
          const token = jwt.sign({ user_id: user.id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

          res.json({ message: "로그인 성공", token });
      });
  });
});

app.get('/logintest', (req, res)=>{
  console.log(req.headers.authorization.split(' ')[1])
  let token = req.headers.authorization.split(' ')[1]


  jwt.verify(token, SECRET_KEY, (err, decoded)=>{
    if(err){
      return res.send("에러!!!")
    }

    return res.send('로그인 성공!')

  })
})