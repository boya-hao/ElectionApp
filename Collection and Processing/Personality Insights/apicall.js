//Get most recent 500 tweets from each candidate and generate personality insights using API
var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials();
var request = require('request');
var fs = require('fs');
var watson = require('watson-developer-cloud');
var elasticsearch = require('elasticsearch');

var client = new elasticsearch.Client({
host: '',
connectionClass: require('http-aws-es'),
amazonES: {
  region: 'us-east-1',
  credentials: myCredentials
},
log: 'trace'
});

var Twit = require('twit');

var T = new Twit({
  consumer_key: '',
  consumer_secret: '',
  access_token: '',
  access_token_secret: ''
});

client.indices.exists({
  index: 'personality1'
  }, function(error, response) {
  if (error) {
    console.error(error.message);
  } else if (!response) {
    client.indices.create({
      index: 'personality1',
      body: {
        mappings: {
          tweet: {
            properties: {
              date: {
                type: 'date'
              },
            }
          }
        }
      }
    }, function(error) {
      if (error) {
        console.error(error.message);
      } 
    });
  }
});

//Get most recent 500 tweets from HillaryClinton
T.get('statuses/user_timeline', {screen_name: 'HillaryClinton', lang: 'en', count: 500 }, function(err, data, response) {
  data.forEach(function(tweet) {
    
    fs.appendFileSync('hillary.txt', tweet.text, encoding='utf8');
  });
});

var textdata = fs.readFileSync('hillary.txt', 'utf8');

//Call the personality insights API and get the results
personality_insights.profile({
  text: textdata,
  language: 'en' },
  function (err, response) {
    if (err)
      console.log('error:', err);
    else
      console.log(JSON.stringify(response, null, 2));
});



