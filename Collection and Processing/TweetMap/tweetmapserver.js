var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials()
var Twit = require('twit');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();

//Use tweet streaming API to collect tweets with geolocation information
var T = new Twit({
  consumer_key: '',
  consumer_secret: '',
  access_token: '',
  access_token_secret: ''
});

var client = new elasticsearch.Client({
  host: '',
  connectionClass: require('http-aws-es'),
  amazonES: {
    region: 'us-east-1',
    credentials: myCredentials
  },
  log: 'trace'
});


var stream = T.stream('statuses/filter', { track: ['Hillary Clinton','Donald Trump'] });

stream.on('tweet', function(tweet) {
  if (tweet.coordinates && tweet.lang === 'en') {
    tweet.date = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'en').valueOf();
    alchemyapi.sentiment('text', tweet.text, {}, function(response) {
      if (response.status === 'OK') {
        //add sentiment field (positive/negative/neutral) to each tweet
        tweet.sentiment = response.docSentiment.type;
        console.log(tweet);
        client.index({
          index: 'candidatetweets',
          type: 'tweet',
          id: tweet.id_str,
          body: tweet
        }, function(error) {
          if (error) {
            console.log(error.message);
          }
        });
      }
    });
  }
});


