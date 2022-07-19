const express = require('express')
const User = require('../models/user')
const { ensureLoggedIn, ensureCorrectUser } = require('../middleware/auth')
const Message = require('../models/message')
const ExpressError = require('../expressError')

const router = new express.Router()

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async (req, res, next) => {
	const { id } = req.params
	const message = await Message.get(id)
	const from_user = message.from_user.username
	const to_user = message.to_user.username

	if (req.body.username === from_user || req.body.username === to_user) {
		return res.json(message)
	}
	throw new ExpressError('Unauthorized', 401)
})

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async (req, res, next) => {
	let { username, to_username, body } = req.body
	console.log(username, to_username, body)
	if (!User.get(to_username)) {
		throw new ExpressError('Recipient not found!', 401)
	}
	if (body.length === 0) {
		throw new ExpressError('Missing message body!', 400)
	}
	const message = await Message.create(username, to_username, body)
	return res.json({ message: message })
})

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async (req, res, next) => {
	const to_username = req.user.username
	const id = req.params.id

	let m = await Message.get(id)
	if (m.to_user.username === to_username) {
		return res.json({ message: Message.markRead(id) })
	}
	throw new ExpressError('You may only view your own messages')
})

module.exports = router
