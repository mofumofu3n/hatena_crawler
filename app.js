var request = require('request'),
    xml2json = require('xml2json'),
    parser = require('feedparser'),
    mongo = require('mongodb');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var DB_NAME = 'hatenadb';
var COLL_NAME = 'test';

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

function saveArticles(requestUrl) { request({url: requestUrl, pool:{maxSockets: 3}})
    .pipe(new parser())
    .on('error', function(err) {
        console.dir('Error hoge: '+err);
    })
    .on('meta', function(meta) {
    })
    .on('readable', function() {
        var stream = this, item;
        while (item = stream.read()) {
            var category = (item.categories)[0];
            var article  = [
            {   
                title: item.title,
                discription: item.description,
                summary: item.summary,
                date: item.date,
                link: item.link,
                category: category.toString()
            } 
            ];

            var startTime = new Date().getTime();
            while(new Date().getTime() < startTime+500);

            console.log('---------------Perform MongoDB--------------');

            db.collection(COLL_NAME, function(err, collection) {
                collection.findOne({link: item.link}, function(err, result) {
                    if (err) {
                        console.log(err);
                        console.log('Error');
                    } else {
                        if(result == null) {
                            console.log('--------------Add Article---------------');
                            db.collection(COLL_NAME, function(err, collection) {
                                collection.insert(article, {safe:true}, function(err, result){

                                    if (err) {
                                        console.log('--------An error has occurred');
                                    } else {
                                        console.log('--------Success Insert: '); 
                                    }
                                })
                            });
                        } else {
                            console.log('------------------No Change---------------');
                        }
                    }
                });
            });
        }
       
    });
}

var requestUrls = new Array(
"http://b.hatena.ne.jp/entrylist/social?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/economics?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/life?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/knowledge?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/entertainment?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/it?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/game?sort=hot&threshold=&mode=rss",
"http://b.hatena.ne.jp/entrylist/fun?sort=hot&threshold=&mode=rss"
);
for (var i = 0; i < requestUrls.length; i++) {
    saveArticles(requestUrls[i]);    
}

process.on('SIGINT', function () {
});
