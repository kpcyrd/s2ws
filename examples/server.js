var s2ws = require('..');

var server = s2ws.server(function(body, func, reject) {
    var url = body.url;

    if(!url) {
        return reject(['no url']);
    }

    func('curl', ['--', url]);
});

server.listen(3000);
