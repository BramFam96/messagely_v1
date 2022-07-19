/** Common config for message.ly */

// read .env files and make environmental variables
require('dotenv').config()
const env = process.env.NODE_ENV

const DB_CONFIG = {
	database: env == 'test' ? 'test_messagely' : 'messagely',
	password: process.env.LOCAL_DB_PW || process.env.DB_PW,
}

const SECRET_KEY = process.env.SECRET_KEY || 'secret'

const BCRYPT_WORK_FACTOR = 1

module.exports = {
	DB_CONFIG,
	SECRET_KEY,
	BCRYPT_WORK_FACTOR,
}