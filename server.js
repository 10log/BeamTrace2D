import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use('/', express.static(__dirname));

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
  console.log('  - 2D Demo: http://localhost:3000/index.html');
  console.log('  - 3D Demo: http://localhost:3000/index3d.html');
});
