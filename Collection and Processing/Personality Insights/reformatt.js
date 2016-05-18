//Store the personality insights into ES using a proper structure
var AWS = require('aws-sdk'); 
var myCredentials = new AWS.SharedIniFileCredentials();
var fs = require('fs');
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


var obj = JSON.parse(fs.readFileSync('trump.json', 'utf8'));

parseData = {};
parseData._id = "Trump";
parseData.personality = {};
parseData.personality.Openness = {};
parseData.personality.Conscientiousness = {};
parseData.personality.Extraversion = {};
parseData.personality.Agreeableness = {};
parseData.personality.Neuroticism = {};

parseData.personality.Openness.percentage = obj.tree.children[0].children[0].children[0].percentage;
parseData.personality.Conscientiousness.percentage = obj.tree.children[0].children[0].children[1].percentage;
parseData.personality.Extraversion.percentage = obj.tree.children[0].children[0].children[2].percentage;
parseData.personality.Agreeableness.percentage = obj.tree.children[0].children[0].children[3].percentage;
parseData.personality.Neuroticism.percentage = obj.tree.children[0].children[0].children[4].percentage;

parseData.personality.Openness.scorelist = [];
parseData.personality.Conscientiousness.scorelist = [];
parseData.personality.Extraversion.scorelist = [];
parseData.personality.Agreeableness.scorelist = [];
parseData.personality.Neuroticism.scorelist = [];

var Openness_children = obj.tree.children[0].children[0].children[0].children,
Conscientiousness_children = obj.tree.children[0].children[0].children[1].children,
Extraversion_children = obj.tree.children[0].children[0].children[2].children,
Agreeableness_children = obj.tree.children[0].children[0].children[3].children,
Neuroticism_children = obj.tree.children[0].children[0].children[4].children;
var i = 0;
var sum = 0;
for (sum =0, i = 0; i < Openness_children.length; i += 1) {
  sum += Openness_children[i].percentage;
}
for (i = 0; i < Openness_children.length; i += 1) {
  parseData.personality.Openness.scorelist.push(Openness_children[i].percentage/sum * parseData.personality.Openness.percentage);
}

for (sum =0, i = 0; i < Conscientiousness_children.length; i += 1) {
  sum += Conscientiousness_children[i].percentage;
}

for (i = 0; i < Conscientiousness_children.length; i += 1) {
  parseData.personality.Conscientiousness.scorelist.push(Conscientiousness_children[i].percentage/sum * parseData.personality.Conscientiousness.percentage);
}

for (sum =0, i = 0; i < Extraversion_children.length; i += 1) {
  sum += Extraversion_children[i].percentage;
}

for (i = 0; i < Extraversion_children.length; i += 1) {
  parseData.personality.Extraversion.scorelist.push(Extraversion_children[i].percentage/sum * parseData.personality.Extraversion.percentage);
}

for (sum =0, i = 0; i < Agreeableness_children.length; i += 1) {
  sum += Agreeableness_children[i].percentage;
}

for (i = 0; i < Agreeableness_children.length; i += 1) {
  parseData.personality.Agreeableness.scorelist.push(Agreeableness_children[i].percentage/sum * parseData.personality.Agreeableness.percentage)
}

for (sum =0, i = 0; i < Neuroticism_children.length; i += 1) {
  sum += Neuroticism_children[i].percentage;
}

for (i = 0; i < Neuroticism_children.length; i += 1) {
  parseData.personality.Neuroticism.scorelist.push(Neuroticism_children[i].percentage/sum * parseData.personality.Neuroticism.percentage)
}

console.log(parseData.personality.Openness.scorelist);

//Update the personality insights when processing is done
client.update({
  index: 'personality1',
  type: 'tweet',
  id: parseData._id,
  body: {
    doc: {
            personality: parseData.personality
          }
  }
}, function (error) {
  if (error) {
    console.log(error.message);
  }
});



