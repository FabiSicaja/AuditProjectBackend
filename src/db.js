const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',     // Cambia a tu usuario de MySQL
    password: 'Admin', // Cambia a tu contraseña de MySQL
    database: 'auditproject'
});

connection.connect((err) => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conexión a la base de datos MySQL establecida.');
});

module.exports = connection;
