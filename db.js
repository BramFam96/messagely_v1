/** Database connection for messagely. */

const { Client } = require('pg')
const { DB_CONFIG } = require('./config')

const client = new Client(DB_CONFIG)

client.connect()

module.exports = client
