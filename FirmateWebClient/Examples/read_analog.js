var http = require('http');
var querystring = require('querystring');

var url = {
    hostname: '192.168.2.37',//device ip
        port: 23456,
        path: '/read_all_pins',//read all pins
      method: 'GET'
};
//send get request
var req = http.request(url,function(res){
    res.setEncoding('utf8');
    res.on('data',function(chunk){
        var returnData = JSON.parse(chunk);
        console.log('A0 state: %s',returnData.data['A0']);
    });
});
req.on('error', function(e){
     console.log('error' + e.message);
});
req.end();