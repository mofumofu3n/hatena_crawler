/**
 *
 * Crawler Hatena RSS
 *
 */

var fs = require('fs'),
    path = require('path'),
    Crawler = require('crawler').Crawler,
    querystring = require('querystring'),
    mongo = require('mongodb');

/**
 * Setting mongoDB
 */
var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var DB_NAME = 'hatenadb';
var COLL_NAME = 'entries';

// Server
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db(DB_NAME, server);

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'articles' database");
        db.collection(COLL_NAME, {strict:true}, function(err, collection) {
            if(err) {
                // サンプルデータでコレクションを作成する
                console.log("The 'articles' collection doesn't exist. Creating it with sample data...");
                //sampleDB();
            } else {
                console.log("Connection db"); 
            }
        });
    }
});



// Setting Crawler
var c = new Crawler ({
    "maxConnections":3,
    
    // This will be called for each crawled page 
    "callback":function (err, result,$) {
        if (err.errno == 49) {
            var entries = JSON.parse(err.path).responseData.feed.entries;
            
            entries.forEach( function (entry) {

                // to BSON
                var article = [
                {
                    title: entry.title,
                    link: entry.link,
                    date: entry.publishedDate,
                    snippet: entry.contentSnippet,
                    summary: entry.content,
                    category: entry.categories.toString()
                }
                ];

                // INSERT mongodb
                db.collection(COLL_NAME, function (err, collection) {
                    collection.findOne({link: entry.link}, function(err, result) {
                        if (err) {
                            console.log(err);
                            console.log('----Error: FIND ON FROM MONGO------');
                        } else {
                            if(result == null) {
                                db.collection(COLL_NAME, function(err, collection) {
                                    collection.insert(article, {safe:true}, function(err, result){
                                        if (err) {
                                            console.log('--------An error has occurred');
                                        } else {
                                            console.log('--------Success Insert: ' + entry.title); 
                                        }
                                    })
                                });
                            } else {
                                console.log('-------No Change: ' + entry.title);
                            }
                        }
                    });
                }); 
            });
        } else {
            console.log('----ERROR----');
        } 
    },

    // Thre is no more queued requests
    "onDrain":function() {
        console.log("----END----");
        process.exit(0);
    }
});
        

var GOOGLE_FEED_API = 'https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&';
var ARTICLE_NUM = 20;
var LIST_PATH = __dirname+ '/list.json';

fs.readFile(LIST_PATH,'utf-8', function (err, data) {
    if (err) {
        console.err("List file is not exists.");
        process.exit(1);
    }
    // json to list
    var list = eval('(' + data + ')');

    list.forEach(function (rssUrl) {
        // encode hatena rss
        var encodeUrl = querystring.stringify({q:rssUrl, num:ARTICLE_NUM});
        var url = GOOGLE_FEED_API + encodeUrl;
        c.queue(url);
    });
});
