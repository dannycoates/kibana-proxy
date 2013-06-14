var Hapi = require('hapi')
var config = require('./config')

var server = new Hapi.Server(config.host, +(process.env.PORT) || config.port)

server.auth(
  'simple',
  {
    scheme: 'basic',
    validateFunc: function (name, password, cb) {
      if (name === 'me' && password === 'TODO') {
        cb(null, true, { name: name })
      }
      else {
        cb(null, false)
      }
    }
  }
)

var esHandler = {
  proxy: {
    host: config.elasticsearch.host,
    port: config.elasticsearch.port,
    protocol: 'http'
  }
}

server.route(
  [
    {
      method: 'POST',
      path: '/{index}/_search',
      handler: esHandler
    },
    {
      method: 'POST',
      path: '/{index}/{type}/_search',
      handler: esHandler
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
          elasticsearch: "http://" + request.info.host,
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
        auth: 'simple'
      }
    },
    {
      method: '*',
      path: '/kibana-int/{param*}',
      handler: esHandler,
      config: {
        auth: 'simple'
      }
    },
    {
      method: 'GET',
      path: '/{param*}',
      handler: {
        directory: {
          path: './kibana'
        }
      }
    }
  ]
)

server.start()
