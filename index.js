const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar o caminho do ffmpeg, caso necessário
// Remova ou ajuste se o ffmpeg já estiver no PATH e funcionando
ffmpeg.setFfmpegPath(path.join('C:', 'ffmpeg', 'bin', 'ffmpeg.exe'));
ffmpeg.setFfprobePath(path.join('C:', 'ffmpeg', 'bin', 'ffprobe.exe'));

// Configurar EJS e pasta de views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar a pasta 'public' para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar o upload de arquivos
const storage = multer.diskStorage({
  destination: 'public/audio',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Rota principal para renderizar a página de upload
app.get('/', (req, res) => {
  res.render('index');
});

// Rota para processar o upload e aplicar o efeito 8D
app.post('/upload', upload.single('audioFile'), (req, res) => {
  const inputPath = path.join(__dirname, req.file.path);
  const outputPath = path.join(__dirname, 'public/audio', 'converted-' + req.file.filename);

  // Usar ffmpeg para aplicar um efeito de "8D"
  ffmpeg(inputPath)
    .audioFilters([
      {
        filter: 'apulsator',
        options: 'hz=0.1' // Controla a velocidade do movimento (0.1 Hz é um movimento suave)
      },
      {
        filter: 'pan',
        options: 'stereo|c0=1.0*c0|c1=1.0*c1' // Mantém o áudio em estéreo
      }
    ])
    .save(outputPath)
    .on('end', () => {
      // Excluir o arquivo de entrada após a conversão para economizar espaço
      fs.unlinkSync(inputPath);
      // Oferecer o download do arquivo convertido
      res.download(outputPath, (err) => {
        if (err) {
          console.error('Erro ao baixar o arquivo:', err);
        } else {
          // Excluir o arquivo convertido após o download
          fs.unlinkSync(outputPath);
        }
      });
    })
    .on('error', (err) => {
      console.error('Erro ao converter o arquivo:', err);
      res.status(500).send('Erro ao converter o arquivo.');
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
