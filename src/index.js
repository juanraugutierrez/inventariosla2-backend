import express from 'express';
import cors from 'cors';

// Importar los controladores modernos (Es OBLIGATORIO incluir la extensión .js al final de la ruta)
import * as perfilCtrl from './controllers/perfilController.js';
import * as usuarioCtrl from './controllers/usuarioController.js';
import * as articuloCtrl from './controllers/articuloController.js';

const app = express();

// Middlewares
// app.use(cors()); 
// app.use(express.json()); 
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Endpoints
app.get('/api/perfiles', perfilCtrl.getPerfiles);       
app.post('/api/perfiles', perfilCtrl.createPerfil);     

app.get('/api/usuarios', usuarioCtrl.getUsuarios);       
app.post('/api/usuarios', usuarioCtrl.createUsuario);   

app.get('/api/articulos', articuloCtrl.getArticulos);     
app.post('/api/articulos', articuloCtrl.createArticulo); 

const PORT = 3000;
app.listen(PORT, () => {
    console.log('======================================================');
    console.log(`🚀 SERVIDOR DE INVENTARIO EN ESM ACTIVADO`);
    console.log(`🔗 URL Base para Postman: http://localhost:${PORT}`);
    console.log('======================================================');
});