const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint para Render
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Quantum Signal Trader is running' });
});

// Endpoint para recibir webhooks de Telegram (si decides usar webhooks)
app.post('/webhook/telegram', (req, res) => {
    console.log('Webhook received:', req.body);
    // Aquí puedes procesar los updates de Telegram
    res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Quantum Signal Trader Pro running on port ${PORT}`);
    console.log(`📱 Access the app at: http://localhost:${PORT}`);
});
