const express = require('express');
const app = express();
const PORT = 3000;
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/auth');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cors = require('cors'); // Importa cors

app.get('/', (req, res) => {
    res.send('El servidor está funcionando correctamente.');
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

const db = require('./db');

// Configura CORS
app.use(cors()); // Permitir todas las solicitudes CORS

// Resto de tu configuración...
app.use(express.json()); // Para poder leer JSON en las peticiones

// Ejemplo de consulta para verificar conexión
db.query('SELECT 1 + 1 AS solution', (error, results) => {
    if (error) throw error;
    console.log('La solución es: ', results[0].solution);
});

// Registro de empleados
// const argon2 = require('argon2');
const bcrypt = require('bcrypt');
app.post('/registro', async (req, res) => {
    const { DPI, nombre, contraseña, limite_credito, saldo_disponible, estado, email, numero_tel} = req.body;
    const hashedcontraseña = await bcrypt.hash(contraseña, 10);
    db.query(`INSERT INTO empleados (DPI, nombre, contraseña, limite_credito, saldo_disponible, estado, email, numero_tel)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
              [DPI, nombre, hashedcontraseña, limite_credito, saldo_disponible, estado, email, numero_tel],
        (err) => {
            if (err) return res.status(500).send(err);
            res.send('Empleado registrado exitosamente');
        }
    );
});

// Login de empleados
app.post('/login', (req, res) => {
    const { DPI, contraseña } = req.body;
    db.query('SELECT * FROM empleados WHERE DPI = ?', [DPI], async (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Empleado no encontrado');

        const isValid = await bcrypt.compare(contraseña, results[0].contraseña);
        if (!isValid) return res.status(401).send('Contraseña incorrecta');

        const token = jwt.sign({ id: results[0].id }, 'tu_secreto', { expiresIn: '1h' });
        res.json({ token });
    });
});

// Solicitar token de autorización
app.post('/solicitar-token', verifyToken, async (req, res) => {
    const { metodo, DPI } = req.body;
    const tokenAutorizacion = Math.floor(100000 + Math.random() * 900000).toString();

    // Enviar por correo o SMS
    db.query('SELECT * FROM empleados WHERE DPI = ?', [DPI], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Empleado no encontrado');
        
        const empleado = results[0];
        if (metodo === 'email') {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'tu_email@gmail.com',
                    pass: 'tu_contraseña'
                }
            });

            const mailOptions = {
                from: 'tu_email@gmail.com',
                to: empleado.email,
                subject: 'Tu token de autorización',
                text: `Tu token es: ${tokenAutorizacion}`
            };

            transporter.sendMail(mailOptions, (error) => {
                if (error) return res.status(500).send(error);
                res.send('Token enviado al correo');
            });
        } else if (metodo === 'sms') {
            const client = twilio('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN');
            client.messages.create({
                body: `Tu token es: ${tokenAutorizacion}`,
                from: '+1234567890', // Tu número Twilio
                to: empleado.numero_tel
            }).then(() => res.send('Token enviado por SMS'))
              .catch(error => res.status(500).send(error));
        }
    });
});

// Consultar saldo
app.post('/consultar-saldo', (req, res) => {
    const { DPI, tokenAutorizacion } = req.body;
    // Aquí puedes validar el token de autorización y el DPI del empleado

    db.query('SELECT saldo_disponible FROM empleados WHERE DPI = ?', [DPI], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('Empleado no encontrado');

        res.json({ saldo_disponible: results[0].saldo_disponible });
    });
});

app.post('/test', (req, res) => {
    console.log(req.body); // Esto debería mostrar el cuerpo en la consola
    res.send('Prueba exitosa');
});
