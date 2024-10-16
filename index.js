const express = require('express');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { exec } = require('youtube-dl-exec');

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

app.post('/convert', upload.single('audioFile'), async (req, res) => {
  const youtubeURL = req.body.youtubeURL;
  let outputPath;

  try {
    if (youtubeURL) {
      const outputDir = path.join(__dirname, 'public/audio');
      const tempFilePath = path.join(outputDir, `${Date.now()}-temp.mp3`);

      // Baixa o áudio do YouTube usando youtube-dl-exec
      await exec(youtubeURL, {
        output: tempFilePath,
        extractAudio: true,
        audioFormat: 'mp3',
        ffmpegLocation: path.join('C:', 'ffmpeg', 'bin', 'ffmpeg.exe'), // Ajuste o caminho do ffmpeg conforme necessário
      });

      console.log('Download do áudio concluído.');

      // Aplica o efeito usando ffmpeg
      const finalOutputPath = path.join(outputDir, `converted-${Date.now()}.mp3`);
      ffmpeg(tempFilePath)
        .audioFilters([
          { filter: 'apulsator', options: 'hz=0.1' },
          { filter: 'pan', options: 'stereo|c0=1.0*c0|c1=1.0*c1' },
        ])
        .audioBitrate('320k')
        .audioCodec('libmp3lame')
        .save(finalOutputPath)
        .on('end', () => {
          fs.unlinkSync(tempFilePath);
          res.render('index', { downloadLink: `/audio/${path.basename(finalOutputPath)}`, errorMessage: null });
        })
        .on('error', (err) => {
          console.error('Erro ao aplicar efeito no áudio:', err);
          res.render('index', { downloadLink: null, errorMessage: 'Erro ao processar o áudio. Tente novamente.' });
        });

    } else if (req.file) {
      const inputPath = path.join(__dirname, req.file.path);
      outputPath = path.join(__dirname, 'public/audio', `converted-${req.file.filename}`);

      ffmpeg(inputPath)
        .audioFilters([
          { filter: 'apulsator', options: 'hz=0.1' },
          { filter: 'pan', options: 'stereo|c0=1.0*c0|c1=1.0*c1' }
        ])
        .audioBitrate('320k')
        .audioCodec('libmp3lame')
        .save(outputPath)
        .on('end', () => {
          fs.unlinkSync(inputPath);
          res.render('index', { downloadLink: `/audio/converted-${req.file.filename}`, errorMessage: null });
        })
        .on('error', (err) => {
          console.error('Erro ao converter o arquivo:', err);
          res.render('index', { downloadLink: null, errorMessage: 'Erro ao processar o arquivo. Tente novamente.' });
        });
    } else {
      res.render('index', { downloadLink: null, errorMessage: 'Por favor, insira um link do YouTube válido ou envie um arquivo.' });
    }
  } catch (error) {
    console.error('Erro durante a conversão:', error);
    res.render('index', { downloadLink: null, errorMessage: 'Ocorreu um erro durante o processamento. Tente novamente.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
