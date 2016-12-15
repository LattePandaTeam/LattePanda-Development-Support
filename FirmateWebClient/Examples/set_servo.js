var http = require('http');
var querystring = require('querystring');

var url = {
    hostname: '192.168.2.37',//device ip
        port: 23456,
        path: '/set_servo/9/20',//set D9 servo to 20 degree
        // path: '/sweep_servo/9',//enable D9 servo sweep  
        // path: '/stop_servo/9',//disable D9 servo sweep         
      method: 'GET'
};
//send get request
var req = http.request(url,function(res){
    res.setEncoding('utf8');
    res.on('data',function(chunk){
        var returnData = JSON.parse(chunk);
        console.log(returnData);
    });
});
req.on('error', function(e){
     console.log('error: ' + e.message);
});
req.end();