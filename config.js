module.exports = {
	host: '0.0.0.0',
	port: 10000,
	elasticsearch: {
		host: '127.0.0.1',
		port: 9200
	},
	persona: {
		verifyUrl: 'https://verifier.login.persona.org/verify',
		audience: 'https://logs.profileinthecloud.net:443'
	},
	auth: {
		emails: [
			"ckarlof@mozilla.com",
			"dcoates@mozilla.com",
			"rfkelly@mozilla.com",
			"zcarter@mozilla.com",
		]
	}
}
