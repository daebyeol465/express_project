const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

app.use(express.json())
const PORT = 3000;

const bcrypt = require('bcrypt'); // bcrypt 모듈 추가
const saltRounds = 10;

const jwt = require('jsonwebtoken'); // JWT 모듈 추가
const SECRET_KEY = "your_secret_key";

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", (req, res) => {
  // 토큰 확인
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "인증 토큰이 필요합니다." });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    // 인증 성공 -> 게시글 작성 처리
    const { title, content } = req.body;

    db.run(
      `INSERT INTO articles (title, content) VALUES (?, ?)`,
      [title, content],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, title, content });
      }
    );
  });
})
app.get('/articles', (req, res) => {
    db.all(`SELECT * FROM articles`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json(rows);
    });
  });

app.get('/articles/:id', (req, res) => {
  let id = req.params.id;

  db.get(`SELECT * FROM articles WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({error: err.message});
    }
    if (!row) {
      return res.status(404).json({error: "데이터가 없습니다."});
    }
    res.json(row);
  });
});

app.delete("/articles/:id", (req, res)=>{
  const id = req.params.id
  db.run('DELETE FROM articles WHERE id = ?', [id], function (err) {
    if (err) {
        console.error('Error deleting article:', err.message);
    } else {
        console.log(`Article with id ${id} deleted successfully`);
    }
});
})

app.put('/articles/:id', (req, res)=>{
  let id = req.params.id
  // let title = req.body.title
  // let content = req.body.content
  let {title, content} = req.body
 // SQL 업데이트 쿼리 (파라미터 바인딩 사용)
 const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
 db.run(sql, [title, content, id], function(err) {
   if (err) {
     console.error('업데이트 에러:', err.message);
     return res.status(500).json({ error: err.message });
   }
   // this.changes: 영향을 받은 행의 수
   res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
 });

})

app.post("/articles/:id/comment", (req, res) => {
    let articleId = req.params.id;
    let content = req.body.content;

    if (!content) {
        return res.status(400).json({ error: "Content is required" });
    }

    db.run(
        "INSERT INTO comments (content, article_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        [content, articleId],
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
  db.all("SELECT * FROM comments WHERE article_id = ?", [articleId], (err, rows) => {
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