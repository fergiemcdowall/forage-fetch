var cheerio = require('cheerio');
var urllib = require('url');
var colors = require('colors');
var fs = require('fs');

var program = require('commander');
program
  .version('0.2.4')
  .option('-d, --directory <directory>', 'specify the fetch directory,',
          String, 'fetch/')
  .option('-r, --urlregexp <urlregexp>', 'an expression that matches the URLs to follow',
          String, '^n')
  .option('-s, --starturl <starturl>',
          'specify the relative URL path to start fetching from',
          String, '/')
  .parse(process.argv);

var directory = program.directory;
if (directory.slice(-1) != '/')
  directory += '/';
if (!fs.existsSync(directory)) { // or fs.existsSync
  fs.mkdirSync(directory);
}

var startURL = program.starturl;
var host = program.hostname;
var discoveredURLs = [];
var crawledURLs = [];


function skipping (statusCode, contentType, url) {
  console.log(statusCode.toString().magenta + ' ' + contentType
              + ': ' + url.toString().red + ' (SKIPPING)'.red);
}


function download(url, callback) {
//  console.log(url);
  var urlBits = urllib.parse(url);
  var protolib;
  debugger;
  if (urlBits.protocol == 'https:') {
    protolib = require('https');
  }
  else
    protolib = require('http');

  protolib.get(url, function(res) {
    if (res.statusCode != '200') {
      skipping(res.statusCode, res.headers['content-type'], url);
      callback(null);
    }
    else if (!res.headers['content-type']) {
      skipping(res.statusCode, 'no content type', url);
      callback(null);
    }
    else if (res.headers['content-type'].indexOf('html') == -1) {
      skipping(res.statusCode, res.headers['content-type'], url);
      callback(null);
    }
    else {
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function() {
        console.log(res.statusCode.toString().magenta
                    + ' ' + res.headers["content-type"]
                    + ': ' + url.toString().green);
        callback(data);
      });
    }
  }).on("error", function() {
    callback(null);
  });
}

crawlPage = function(url) {
  //startup doesnt have to abide by the regexp filter
  if ((!regexpIsTrue(url)) && (url != program.starturl)) {
    if (discoveredURLs.length > 0)
      crawlPage(discoveredURLs.shift());
    else
      console.log('finished fetch');
  }
  else {
    download(url, function(data) {
      if (data) {
        var $ = cheerio.load(data);
        $("a").each(function(i, e) {
          var link = $(e);
          if (!link.attr('href'))
            return
          var thisURL = urllib.resolve(url, link.attr('href'));
          if (crawledURLs.indexOf(thisURL) != -1)
            return
//          console.log(thisURL);
          crawledURLs.push(thisURL);
          if (thisURL != program.starturl)
          discoveredURLs.push(thisURL);
        });
        fs.writeFile(program.directory + encodeURIComponent(url), data, function(err) {
          if(err) {
            console.log(err);
          } else {
            //success
          }
        });
      }
      if (discoveredURLs.length > 0)
        crawlPage(discoveredURLs.shift());
      else
        console.log('finished fetch');
    });
  }
}

regexpIsTrue = function(url) {
  var r = new RegExp(program.urlregexp);
//  console.log('regexp ' + program.urlregexp + ' on ' + url + ' is ' + r.test(url));
  if (r.test(url)) return true
  else return false
}

//console.log(startURL);

crawlPage(startURL);

