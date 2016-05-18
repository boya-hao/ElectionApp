var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials()
var Twit = require('twit');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();
var TopicDetection = require('topic-detection');
var detector = new TopicDetection();
var request = require('request');

//Establish a tweet streaming client
var T = new Twit({
  consumer_key: '',
  consumer_secret: '',
  access_token: '',
  access_token_secret: ''
});

//Establish an AWS ES client
var client = new elasticsearch.Client({
  host: '',
  connectionClass: require('http-aws-es'),
  amazonES: {
    region: 'us-east-1',
    credentials: myCredentials
  },
  log: 'trace'
});

//Create an ES index if not exist
client.indices.exists({
  index: 'tweetsfortopics'
}, function(error, response) {
  if (error) {
    console.error(error.message);
  } else if (!response) {
    client.indices.create({
      index: 'tweetsfortopics',
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

//Open a stream to track candidates' names
var stream = T.stream('statuses/filter', { track: ['Hillary','Trump'] });

stream.on('tweet', function(tweet) {
  if (tweet.lang === 'en') {
    parsedTweet = {};
    parsedTweet.text = tweet.text;
    parsedTweet['topics'] = [];
    //add date field to each tweets
    parsedTweet.date = moment(tweet.created_at, 'ddd MMM DD HH:mm:ss ZZ YYYY', 'en').valueOf();

    //add a list of topic to the topics field of each tweets
    scores = detector.topics(tweet.text);
    for (var score in scores) {
      if (scores[score] > 0.1) {
        parsedTweet['topics'].push(score);
      }
    }
    alchemyapi.sentiment('text', tweet.text, {}, function(response) {
      if (response.status === 'OK') {
        //ass sentiment score field to each tweet
        parsedTweet.sentiment = parseFloat(response.docSentiment.score);
        request({
          url: 'http://gateway-a.watsonplatform.net/calls/text/TextGetEmotion',
          qs: {
            apikey: '',
            text: parsedTweet.text,
            outputMode: 'json'
          }
        }, function(err, response, body) {
          if (err) {
            console.log(err.message);
          } else {
            var jsonBody = JSON.parse(body);
            var emotions = jsonBody.docEmotions;
            //add emotion scores for each tweet
            if (emotions) {
              parsedTweet.emotions = {
                anger: parseFloat(emotions.anger),
                disgust: parseFloat(emotions.disgust),
                fear: parseFloat(emotions.fear),
                joy: parseFloat(emotions.joy),
                sadness: parseFloat(emotions.sadness)
              };
              //insert the processed tweets in the AWS ES
              client.index({
                index: 'tweetsfortopics',
                type: 'tweet',
                id: tweet.id_str,
                body: parsedTweet
              }, function (error) {
                if (error) {
                  console.log(error.message);
                }
              });
            }
          }
        });
        console.log(parsedTweet);
      }
    });
  }
});
