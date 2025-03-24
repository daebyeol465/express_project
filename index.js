const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

app.use(express.json())
const PORT = 3000;

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", (req, res)=>{
    let {title, content} = req.body;

    db.run(`INSERT INTO articles (title, content) VALUES (?, ?)`,
    [title, content],
    function(err) {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json({id: this.lastID, title, content});
    });
});

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
  console.log('dfsdfdsf')
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
