var crypto = require('crypto')
var Hapi = require('hapi')
var config = require('./config')
var verifier = require('request')

var verifyUrl = config.persona.verifyUrl
var audience = process.env.PERSONA_AUDIENCE || config.persona.audience

var server = new Hapi.Server(
  config.host,
  +(process.env.PORT) || config.port,
  {
    files: {
      relativeTo: __dirname
    }
  }
)

server.auth(
  'session',
  {
    scheme: 'cookie',
    password: crypto.randomBytes(32).toString('base64'),
    redirectTo: '/login'
  }
)

server.ext(
  'onPreResponse',
  function (request, next) {
    var res = request.response();
    // error responses don't have `header`
    if (res.header) {
      res.header('Strict-Transport-Security', 'max-age=10886400');
    }
    next();
  }
);

var esHandler = {
  proxy: {
    host: config.elasticsearch.host,
    port: config.elasticsearch.port,
    protocol: 'http'
  }
}

function auth(request) {
  var assertion = request.payload.assertion
  verifier.post(
    {
      url: verifyUrl,
      form: {
        assertion: assertion,
        audience: audience
      }
    },
    function (err, response, body) {
      if (err) {
        return request.reply(Hapi.error.internal('Verification Error', err))
      }
      var result = JSON.parse(body)
      if (result.status === 'okay') {
        if (config.auth.emails.indexOf(result.email) > -1) {
          request.auth.session.set({email: result.email})
          request.reply(result)
        }
        else {
          request.reply(Hapi.error.unauthorized('Invalid Email'))
        }
      }
      else {
        request.reply(Hapi.error.badRequest('Invalid Assertion'))
      }
    }
  )
}

function logout(request) {
  request.auth.session.clear()
  request.reply.redirect('/')
}

server.route(
  [
    {
      method: 'GET',
      path: '/logout',
      handler: logout,
      config: {
        auth: {
          strategy: 'session',
          mode: 'try'
        }
      }
    },
    {
      method: 'GET',
      path: '/login',
      handler: {
        file: {
          path: 'login.html'
        }
      }
    },
    {
      method: 'POST',
      path: '/auth',
      handler: auth,
      config: {
        auth: {
          strategy: 'session',
          mode: 'try'
        }
      }
    },
    {
      method: 'POST',
      path: '/{index}/_search',
      handler: esHandler,
      config: {
        auth: 'session'
      }
    },
    {
      method: 'POST',
      path: '/{index}/{type}/_search',
      handler: esHandler,
      config: {
        auth: 'session'
      }
    },
    {
      method: 'GET',
      path: '/_aliases',
      handler: esHandler
    },
    {
      method: 'GET',
      path: '/config.js',
      handler: function (request) {
        var x = {
          elasticsearch: "https://" + request.info.host,
          kibana_index: "kibana-int",
          modules: ['histogram','map','pie','table','stringquery','sort',
                    'timepicker','text','fields','hits','dashcontrol',
                    'column','derivequeries','trends'],
        }
        request
          .reply('var config = new Settings(' + JSON.stringify(x) + ');')
          .type('application/javascript')
      }
    },
    {
      method: '*',
      path: '/kibana-int/dashboard/{param*}',
      handler: esHandler,
      config: {
        auth: 'session'
      }
    },
    {
      method: '*',
      path: '/kibana-int/{param*}',
      handler: esHandler,
      config: {
        auth: 'session'
      }
    },
    {
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: './kibana'
        }
      },
      config: {
        auth: 'session'
      }
    }
  ]
)

server.start()
