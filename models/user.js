/** User class for message.ly */

const bcrypt = require('bcrypt')
const { BCRYPT_WORK_FACTOR } = require('../config')
const client = require('../db')
const ExpressError = require('../expressError')

/** User of the site. */

class User {
	/** register new user -- returns
	 *    {username, password, first_name, last_name, phone}
	 */

	static async register({ username, password, first_name, last_name, phone }) {
		const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
		const result = await client.query(
			`
    INSERT INTO users 
    (username, password, first_name, last_name, phone, join_at, last_login_at)
    VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
    ON CONFLICT (username) DO NOTHING
    RETURNING username, password, first_name, last_name, phone
    `,
			[username, hashedPw, first_name, last_name, phone]
		)
		// Check success
		let user = result.rows[0]
		if (user.length === 0) {
			throw new ExpressError('Username taken', 409)
		}
		return user
	}

	/** Authenticate: is this username/password valid? Returns boolean. */

	static async authenticate(username, password) {
		const result = await client.query(
			`
    SELECT password FROM users WHERE username = $1
    `,
			[username]
		)

		let user = result.rows[0]
		if (!user) {
			return false
		}
		if ((await bcrypt.compare(password, user.password)) === true) {
			return true
		}
		return false
	}

	/** Update last_login_at for user */

	static async updateLoginTimestamp(username) {
		const query = await client.query(
			`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE username=$1 RETURNING username`,
			[username]
		)
		if (!query.rows[0]) {
			throw new ExpressError('Username not found', 404)
		}
	}

	/** All: basic info on all users:
	 * [{username, first_name, last_name, phone}, ...] */

	static async all() {
		const results = await client.query(`
    SELECT username, first_name, last_name, phone FROM users`)
		if (results.rows.length === 0) {
			throw new ExpressError('Unable to connect to database', 500)
		}
		return results.rows
	}

	/** Get: get user by username
	 *
	 * returns {username,
	 *          first_name,
	 *          last_name,
	 *          phone,
	 *          join_at,
	 *          last_login_at } */

	static async get(username) {
		const result = await client.query(
			`
    SELECT 
    username, first_name, last_name, phone, join_at, last_login_at
    FROM users 
    WHERE username = $1`,
			[username]
		)

		if (!result.rows[0]) {
			throw new ExpressError('User not found', 404)
		}

		return result.rows[0]
	}

	/** Return messages from this user.
	 *
	 * [{id, to_user, body, sent_at, read_at}]
	 *
	 * where to_user is
	 *   {username, first_name, last_name, phone}
	 */

	static async messagesFrom(username) {
		const result = await client.query(
			`
    SELECT 
    m.id,
    t.username AS to_username,
    t.first_name AS to_first_name,
    t.last_name AS to_last_name,
    t.phone AS to_phone,
    m.body,
    m.sent_at,
    m.read_at,
    FROM messages as m
    JOIN users as t ON m.to_user = t.username
    WHERE m.from_user=$1`,
			[username]
		)

		let messages = result.rows

		if (messages.length === 0) {
			throw new ExpressError(`User ${username} has not sent messages:`, 404)
		}
		return messages.map((m) => ({
			id: m.id,
			to_user: {
				username: m.to_username,
				first_name: m.to_first_name,
				last_name: m.to_last_name,
				phone: m.to_phone,
			},
			body: m.body,
			sent_at: m.sent_at,
			read_at: m.read_at,
		}))
	}
	/** Return messages to this user.
	 *
	 * [{id, from_user, body, sent_at, read_at}]
	 *
	 * where from_user is
	 *   {username, first_name, last_name, phone}
	 */

	static async messagesTo(username) {
		const result = client.query(
			`
    SELECT 
    m.id,
    f.username AS from_username,
    f.first_name AS from_first_name,
    f.last_name AS from_last_name,
    f.phone AS from_phone,
    m.body,
    m.sent_at,
    m.read_at,
    FROM messages as m
    JOIN users as t ON m.from_user = f.username
    WHERE m.from_user=$1`,
			[username]
		)

		let m = result.rows

		if (m.length === 0) {
			throw new ExpressError(
				`User ${username} has not received any messages:`,
				404
			)
		}
		m.map((r) => ({
			id: r.id,
			from_user: {
				username: r.from_username,
				first_name: r.from_first_name,
				last_name: r.from_last_name,
				phone: r.from_phone,
			},
			body: r.body,
			sent_at: r.sent_at,
			read_at: r.read_at,
		}))
	}
}

module.exports = User
