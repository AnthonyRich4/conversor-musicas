const { exec } = require('child_process');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: 'public/audio',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  res.render('index', { downloadLink: null, errorMessage: null });
});

app.post('/convert', upload.single('audioFile'), (req, res) => {
  if (!req.file) {
    return res.render('index', { downloadLink: null, errorMessage: 'Por favor, envie um arquivo de áudio.' });
  }

  const inputPath = path.join(__dirname, req.file.path);
  const outputDir = path.join(__dirname, 'public/audio');
  const finalOutputPath = path.join(outputDir, `converted-${Date.now()}.mp3`);

  // Comando para aplicar o efeito 8D com vários filtros
  const ffmpegCommand = `ffmpeg -i ${inputPath} -filter_complex "apulsator=hz=0.1, aecho=0.8:0.9:100|100:0.5|0.3, pan=stereo|c0=1.0*c0|c1=1.0*c1, compand=attacks=0:points=-90/-900|-70/-20|0/-20|20/0|20/0, equalizer=f=60:t=q:w=1:g=3, chorus=0.6:0.9:50:0.4:0.25:2" -b:a 320k ${finalOutputPath}`;

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao aplicar efeitos: ${stderr}`);
      return res.render('index', { downloadLink: null, errorMessage: 'Erro ao processar o áudio.' });
    }

    fs.unlinkSync(inputPath);
    res.render('index', { downloadLink: `/audio/${path.basename(finalOutputPath)}`, errorMessage: null });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
