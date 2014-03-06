/**
 *
 * Crawler Hatena RSS
 *
 */
var fs = require('fs');
var path = require('path');
var Crawler = require('crawler').Crawler;
var mongo = require('mongodb');

/**
 * Setting mongoDB
 */
var Server = mongo.Server;
var Db = mongo.Db;
var BSON = mongo.BSONPure;

var DB_NAME = 'hatenadb';
var COLL_NAME = 'article';

// Server
var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db(DB_NAME, server);

db.open(function(err, db) {
    if (!err) {
        console.log("Connected to 'articles' database");
        db.collection(COLL_NAME, {strict:true}, function(err, collection) {
            if (err) {
                // サンプルデータでコレクションを作成する
                console.log("The 'articles' collection doesn't exist. Creating it with sample data...");
                sampleDB();
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
        var channel_title = $("channel title").text();
        var channel_desc = $("channel description").text();

        $("item").each(function(i) {
            var title,url,description,content,date,subject,bookmark;
            var article = {};

            $(this).children().each(function() {
                var tag = $(this)[0].tagName;

                if (tag === "TITLE") {
                    article.title = $(this).text();
                }

                if (tag === "DESCRIPTION") {
                    article.description = $(this).text();
                }

                if (tag === "CONTENT:ENCODED") {
                    var content = $(this).text();
                    // conten内からURLを取得
                    $(content).each(function() {
                        article.url = $(this).attr('cite');
                    });
                }

                if (tag === "DC:DATE") {
                    article.date = dateChanger($(this).text());
                }

                if (tag === "DC:SUBJECT") {
                    article.subject = $(this).text();
                }

                if (tag === "HATENA:BOOKMARKCOUNT") {
                    article.bookmark = $(this).text();
                }
            });

            // 既に保存されていれば、updateし、なければinsert
            db.collection(COLL_NAME, function (err, collection) {
                collection.update({title: article.title, }, article, {safe:true, upsert:true}, function (err, result) {
                    if (err) {
                        console.log(err.message);
                    } else {
                        console.log(result);
                    }
                });
            });
        });
    },

    // Thre is no more queued requests
    "onDrain":function() {
        console.log("----END----");
        process.exit(0);
    }
});


/**
 *  クロールするURLのパス
 */
var LIST_PATH = __dirname+ '/list.json';

/**
 * リスト読み込み
 */
fs.readFile(LIST_PATH,'utf-8', function (err, data) {
    if (err) {
        console.err("List file is not exists.");
        process.exit(1);
    }
    // json to list
    var list = eval('(' + data + ')');

    list.forEach(function (rssUrl) {
        // add queue
        c.queue(rssUrl);
    });
});


/**
 * ISOフォーマットの日時をUNIXTIMEに変換
 */
var dateChanger = function(isoStr) {
    var date = new Date(isoStr);   
    return parseInt(date/1000);
};

/**
 * サンプル用データ
 */
var sampleDB = function() {
    var article = [
        {
        title: "dummy",
        url: "http://dummy.com",
        description: "dummydummy",
        content: "dummy",
        date: "1373554397",
        subject: "dummy",
        bookmark: "4" 
    }];

    db.collection(COLL_NAME, function (err, collection) {
        collection.insert(article, {safe:true}, function (err, result) {});
    });
};
