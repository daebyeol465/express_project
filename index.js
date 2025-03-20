const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

app.use(express.json())
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
app.post("/articles", (req, res)=>{
    console.log("안녕~~~ 여기에 찍혀야함!!")
    console.log(req.body.title)
    console.log(req.body.content)
    res.send('ok')
});