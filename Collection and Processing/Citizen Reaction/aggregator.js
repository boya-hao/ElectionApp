//Aggregation of the tweets containing topic information

var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials();
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

var topics = ['politics', 'commerce', 'law', 'economy', 'earth'];
var candidates = ['Hillary', 'Trump'];
var loopCall = function(topics, candidates) {
  for (i in candidates) {
  	for (j in topics) {
  		var json = {};
  		var candidate = candidates[i];
  		var topic = topics[j];
  		console.log(candidate + " " + topic);
  		json.candidate = candidate;
      	json.topic = topic;
      	test(candidate, topic, json);
  	}
  }
};

var count = 0;
var timer = setInterval(function(){
	loopCall(topics, candidates);
}, 5000);

function test(candidate, topic, json) {
	client.search({
            index: 'tweetsfortopics',
            type: 'tweet',
            size: 1000,
            body: {
              query: {
              	bool: {
              		must: [
	                	{match: {text: candidate}},
	                	{match: {topics: topic}}
                	]
              	}
              },
              aggs: {
                'avg_sentiment': {avg: {field: 'sentiment'}},
                'avg_anger': {avg: {field: 'anger'}},
                'avg_disgust': {avg: {field: 'disgust'}},
                'avg_fear': {avg: {field: 'fear'}},
                'avg_joy': {avg: {field: 'joy'}},
                'avg_sadness': {avg: {field: 'sadness'}}
              }
          	}
	      	}, function(err, response, body){
	            if (err) {
	              console.log(err.message);
	            } else {
	              console.log(candidate + ' ' + topic + ' is here');
	              var stats = response.aggregations;
	              json.sentiment = stats.avg_sentiment.value;
	              if (json.sentiment == null) {
	              	json.sentiment = 0;
	              }
	              json.sentiment = json.sentiment.toFixed(2);
	              json.emotions = [
	                stats.avg_anger.value,
	                stats.avg_disgust.value,
	                stats.avg_fear.value,
	                stats.avg_joy.value,
	                stats.avg_sadness.value
	              ];
	              client.update({
                  index: 'candidateresults2',
                	type: 'tweet',
                	id: candidate + topic,
                	body: {
                		doc: {
      						sentiment: json.sentiment,
      						emotions: json.emotions
    					}
                	}
              	   }, function (error) {
                		if (error) {
                  		console.log(candidate + topic + ' ' + error.message);
                		}
              		});
              		console.log(new Date());
	            }
	      });
	}

