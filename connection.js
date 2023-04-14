const mysql = require('mysql');

var connection = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "Sanku@2003",
    database: "test",
});

module.exports = connection;