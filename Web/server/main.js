import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Async } from 'meteor/meteorhacks:async';
import { Shows } from '../imports/api/shows.js';
import { Tweets } from '../imports/api/tweets.js';
import {Personality} from '../imports/api/personality.js';

var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials()


Meteor.publish('tweets', function tweetsPublication() {
  return Tweets.find({});
});

//Initialize the web server

Meteor.startup(() => {
  let elasticsearch = require('elasticsearch');

  //establish a AWS ElasticSearch client
  let client2 = new elasticsearch.Client({
    host: 'xxx',
    connectionClass: require('http-aws-es'),
    amazonES: {
      region: 'us-east-1',
      credentials: myCredentials
    },
    log: 'trace'
  });

  //Publish the aggregated sentiment/emotion scores by candidate by topic to the mongo DB collection called shows
  Meteor.publish('shows', function showsPublication() {
    client2.search({
        index: 'candidateresults2',
        type: 'tweet',
        size: 10,
        body: {
          query: {
            match_all: {}
          }
        }
      }, Meteor.bindEnvironment((error, response) => {
        if (error) {
          console.log(error.message);
        } else {
          let results = response.hits.hits;
          results.forEach((result) => {
            if (!Shows.findOne(result._id)) {
              Shows.insert(result);
            }
          });
        }
      }, (err) => { console.log(err.message); }));
    return Shows.find({});
  });

  //Publish the personality insights results of each candidate to the Mongo DB collection called personality
  Meteor.publish('personality', function personalityPublication() {
    client2.search({
        index: 'personality1',
        type: 'tweet',
        size: 3,
        body: {
          query: {
            match_all: {}
          }
        }
      }, Meteor.bindEnvironment((error, response) => {
        if (error) {
          console.log(error.message);
        } else {
          let results = response.hits.hits;
          results.forEach((result) => {
            console.log(result);
            Personality.update(result._id, { $set: {_source: result._source }})
          });
        }
      }, (err) => { console.log(err.message); }));
    return Personality.find({});
  });

  //Update the Collection shows with newly aggregated results every 10 seconds
  if (Meteor.isServer) {
      Meteor.setInterval(function mirrorUpdate() {
        client2.search({
          index: 'candidateresults2',
          type: 'tweet',
          size: 10,
          body: {
            query: {
              match_all: {}
            }
          }
        }, Meteor.bindEnvironment((error, response) => {
          if (error) {
            console.log(error.message);
          } else {
            let results = response.hits.hits;
            results.forEach((result) => {
                Shows.update(result._id, { $set: { _source: result._source }})
            });
          }
        }, (err) => { console.log(err.message); }));
    }, 10000);
  }


  //Define methods searchAll and searchFor to search tweets with geolocation in the AWS ES
  Meteor.methods({
    'searchAll'() {
      client2.search({
        index: 'candidatetweets',
        type: 'tweet',
        size: 100,
        sort: 'date:desc',
        body: {
          query: {
            match_all: {}
          }
        }
      }, Meteor.bindEnvironment((error, response) => {
        if (error) {
          console.log(error.message);
        } else {
          let tweets = response.hits.hits;
          tweets.forEach((tweet) => {
            if (!Tweets.findOne(tweet._id)) {
              Tweets.insert(tweet);
            }
          });
        }
      }, (err) => { console.log(err.message); }));
    },
    'searchFor'(query) {
      check(query, String);
      let response = Async.runSync((done) => {
        client2.search({
          index: 'candidatetweets',
          type: 'tweet',
          size: 100,
          sort: 'date:desc',
          q: query
        }, (error, response) => {
          done(error, response);
        });
      });
      if (response.error) {
        console.log(response.error.message);
      } else {
        let tweetIds = [];
        let tweets = response.result.hits.hits;
        tweets.forEach((tweet) => {
          tweetIds.push(tweet._id);
          if (!Tweets.findOne(tweet._id)) {
            Tweets.insert(tweet);
          }
        });
        return tweetIds;
      }
    },
  });
});
