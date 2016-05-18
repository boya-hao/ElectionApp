import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { Session } from 'meteor/session';
import { Geolocation } from 'meteor/mdg:geolocation';
import { GoogleMaps } from 'meteor/dburles:google-maps';
import { Shows } from '../imports/api/shows.js';
import { Tweets } from '../imports/api/tweets.js';
import {Personality} from '../imports/api/personality.js';
import {MarkerCluster} from '../imports/api/markercluster.js'

import './main.html';
var Highcharts = require('highcharts');
require('highcharts-exporting');

//Subscribe three collections
Meteor.subscribe('tweets');
Meteor.subscribe('shows');
Meteor.subscribe('personality');

//Initialize the client program
Meteor.startup(() => {

  //Set default topic with initial value 'politics
  Session.set("topic_id", 'politics');


  GoogleMaps.load({key: 'AIzaSyAivc8eHjOOu0cuqs_pozHkmyxx9ysSdA0'});

  //Add selectize event listener to the dropdown in the tweetmap
  $('#selectcandidate').selectize({
    dropdownParent: 'body',
    onItemAdd(value, $item) {
      if (value === 'all') {
        Meteor.call('searchAll', (err) => {
          if (err) {
            console.log(err.message);
          } else {
            deleteMarkers();
            Tweets.find({}, {sort: {'_source.date': -1}, limit: 100}).forEach((hit) => {
              addMarker(hit._source.text, hit._source.coordinates.coordinates, hit._source.sentiment);
            });
          }
        });
      } else {
        let qArr = value.split(' ');
        let query = qArr[0] + ' AND ' + qArr[1];
        Meteor.call('searchFor', query, (err, result) => {
          if (err) {
            console.log(err.message);
          } else {
            deleteMarkers();
            let map = GoogleMaps.maps.tweetMap.instance;
            Tweets.find({_id: {$in: result}}).forEach((hit) => {
              addMarker(hit._source.text, hit._source.coordinates.coordinates, hit._source.sentiment);
            });
          }
        });
      }
    }
  });
});

Tracker.autorun((computation) => {
  let latLng = Geolocation.latLng();
  if (latLng == null) {
    let err = Geolocation.error();
    if (err) {
      console.log(err.message);
      computation.stop();
    }
  } else if (latLng) {
    Session.set('userLoc', latLng);
    GoogleMaps.maps.tweetMap.instance.panTo(latLng);
    computation.stop();
  }
});


//Define helper functions for the body in the html
Template.body.helpers({
  //default setting of the Google map
  mapOptions() {
    if (GoogleMaps.loaded()) {
      let center = {lat: 40.8075, lng: -73.9619};
      let loc = Session.get('userLoc');
      if (loc) {
        center = loc;
      }
      return {
        center: center,
        zoom: 3
      };
    }
  },
  //Find Hillary's sentiment/emotions by topic
  getShowHillary(name) {
    return Shows.findOne({_id: name + Session.get("topic_id")});
  },
  //Find Trump's sentiment/emotions by topic
  getShowTrump(name, topic) {
    return Shows.findOne({_id: name + Session.get("topic_id")});
  },
  //Find personality entry given the candidate name
  getPersonality(name) {
    return Personality.findOne({_id: name});
  }
});

//Define the marker's icons
var markers = [];
const iconBase = 'http://maps.google.com/mapfiles/ms/icons/';
const icons = {
  positive: {
    name: 'Positive',
    icon: iconBase + 'blue-dot.png'
  },
  negative: {
    name: 'Negative',
    icon: iconBase + 'red-dot.png'
  },
  neutral: {
    name: 'Neutral',
    icon: iconBase + 'purple-dot.png'
  }
};

// Adds a marker to the map and push to the array.
function addMarker(tweetText, tweetCoor, tweetSent) {
  let map = GoogleMaps.maps.tweetMap.instance;
  let location = {lat: tweetCoor[1], lng: tweetCoor[0]};
  let marker = new google.maps.Marker({
    position: location,
    icon: icons[tweetSent].icon,
    animation: google.maps.Animation.DROP,
    map: map
  });
  let infowindow = new google.maps.InfoWindow({
    content: tweetText,
    maxWidth: 180
  });
  marker.addListener('click', () => {
    infowindow.open(map, marker);
    map.setZoom(8);
    map.panTo(marker.getPosition());
  });
  markers.push(marker);
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  clearMarkers();
  markers = [];
}

function getDistance() {
  let distance = $('#distance').val();
  if (distance) {
    if($.isNumeric(distance) && Math.floor(distance) == distance) {
      return distance+'km';
    }
  }
  return '1000km';
}


//Initilize the body by showing all the tweets
Template.body.onCreated(function bodyOnCreated() {
  Meteor.subscribe('shows');
  GoogleMaps.ready('tweetMap', (map) => {
    let $legend = $('#legend');
    for (let key in icons) {
      let type = icons[key];
      let name = type.name;
      let icon = type.icon;
      let $div = $(document.createElement('div'));
      $div.html('<img src="' + icon + '"> ' + name);
      $legend.append($div);
    }
    map.instance.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);

    Meteor.call('searchAll', (err) => {
      if (err) {
        console.log(err.message);
      } else {
        deleteMarkers();
        Tweets.find({}, {sort: {'_source.date': -1}, limit: 100}).forEach((hit) => {
          addMarker(hit._source.text, hit._source.coordinates.coordinates, hit._source.sentiment);
        });
      }
    });
  });
});

//Define helper function (barChart) in showRating template
Template.showRating.helpers({
  barChart: function(emotions1, emotions2) {
   $('#container1').highcharts({
          chart: {
              type: 'bar'
          },
          title: {
              text: 'Emotion Scores'
          },
          xAxis: {
              categories: ['Anger', 'Disgust', 'Fear','Joy','Sadness']
          },
          yAxis: {
              title: {
                  text: 'Scores'
              }
          },
          plotOptions: {
            bar: {
              dataLabels: {
                enabled: true,
                format: '{point.y: .2f}'
              }
            }
          },
          series: [{
              name: 'Emotion Scores',
              data: emotions1
          }],
      });
   $('#container2').highcharts({
          chart: {
              type: 'bar'
          },
          title: {
              text: 'Emotion Scores'
          },
          xAxis: {
              categories: ['Anger', 'Disgust', 'Fear','Joy','Sadness']
          },
          yAxis: {
              title: {
                  text: 'Scores'
              }
          },
          plotOptions: {
            bar: {
              dataLabels: {
                enabled: true,
                format: '{point.y: .2f}'
              }
            }
          },
          series: [{
              name: 'Emotion Scores',
              data: emotions2
          }],
      });
},
});

//Add listener to the topic selection event
Template.showRating.events({
  'change #selecttopic': function(event) {
    var cur_topic = $(event.target).val();
    Session.set("topic_id", cur_topic);
    console.log(Session.get("topic_id"));
  },
});

//Define pieChart funtion in the showPersonality template
Template.showPersonality.helpers({
   pieChart: function(personality1, personality2) {

       var colors = Highcharts.getOptions().colors,
        categories = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
        data1 = [{
            y: personality1.Openness.percentage,
            color: colors[0],
            drilldown: {
                name: 'Openness',
                categories: ['Adventurousness', 'Artistic interest', 'Emotionality', 'Imagination', 'Intellect','Liberalism'],
                data: personality1.Openness.scorelist,
                color: colors[0]
            }
        }, {
            y: personality1.Conscientiousness.percentage,
            color: colors[1],
            drilldown: {
                name: 'Conscientiousness',
                categories: ['Achievement striving', 'Cautiousness', 'Dutifulness', 'Orderliness', 'Self-discipline', 'Self-efficacy'],
                data: personality1.Conscientiousness.scorelist,
                color: colors[1]
            }
        }, {
            y: personality1.Extraversion.percentage,
            color: colors[2],
            drilldown: {
                name: 'Extraversion',
                categories: ['Activity level', 'Assertiveness', 'Cheerfulness', 'Excitement-seeking', 'Friendliness',
                    'Gregariousness'],
                data: personality1.Extraversion.scorelist,
                color: colors[2]
            }
        }, {
            y: personality1.Agreeableness.percentage,
            color: colors[3],
            drilldown: {
                name: 'Agreeableness',
                categories: ['Altruism', 'Cooperation', 'Modesty', 'Morality', 'Sympathy', 'Trust'],
                data: personality1.Agreeableness.scorelist,
                color: colors[3]
            }
        }, {
            y: personality1.Neuroticism.percentage,
            color: colors[4],
            drilldown: {
                name: 'Neuroticism',
                categories: ['Anger', 'Anxiety', 'Depression', 'Immoderation','Self-consciousness','Vulnerability'],
                data: personality1.Neuroticism.scorelist,
                color: colors[4]
            }
        },],
        browserData1 = [],
        versionsData1 = [],
        i1,
        j1,
        dataLen1 = data1.length,
        drillDataLen1,
        brightness1;


    // Build the data arrays
    for (i1 = 0; i1 < dataLen1; i1 += 1) {

        // add browser data
        browserData1.push({
            name: categories[i1],
            y: data1[i1].y,
            color: data1[i1].color
        });

        // add version data
        drillDataLen1 = data1[i1].drilldown.data.length;
        for (j1 = 0; j1 < drillDataLen1; j1 += 1) {
            brightness1 = 0.2 - (j1 / drillDataLen1) / 5;
            versionsData1.push({
                name: data1[i1].drilldown.categories[j1],
                y: data1[i1].drilldown.data[j1],
                color: Highcharts.Color(data1[i1].color).brighten(brightness1).get()
            });
        }
    }

    var data2 = [{
            y: personality2.Openness.percentage,
            color: colors[0],
            drilldown: {
                name: 'Openness',
                categories: ['Adventurousness', 'Artistic interest', 'Emotionality', 'Imagination', 'Intellect','Liberalism'],
                data: personality2.Openness.scorelist,
                color: colors[0]
            }
        }, {
            y: personality2.Conscientiousness.percentage,
            color: colors[1],
            drilldown: {
                name: 'Conscientiousness',
                categories: ['Achievement striving', 'Cautiousness', 'Dutifulness', 'Orderliness', 'Self-discipline', 'Self-efficacy'],
                data: personality2.Conscientiousness.scorelist,
                color: colors[1]
            }
        }, {
            y: personality2.Extraversion.percentage,
            color: colors[2],
            drilldown: {
                name: 'Extraversion',
                categories: ['Activity level', 'Assertiveness', 'Cheerfulness', 'Excitement-seeking', 'Friendliness',
                    'Gregariousness'],
                data: personality2.Extraversion.scorelist,
                color: colors[2]
            }
        }, {
            y: personality2.Agreeableness.percentage,
            color: colors[3],
            drilldown: {
                name: 'Agreeableness',
                categories: ['Altruism', 'Cooperation', 'Modesty', 'Morality', 'Sympathy', 'Trust'],
                data: personality2.Agreeableness.scorelist,
                color: colors[3]
            }
        }, {
            y: personality2.Neuroticism.percentage,
            color: colors[4],
            drilldown: {
                name: 'Neuroticism',
                categories: ['Anger', 'Anxiety', 'Depression', 'Immoderation','Self-consciousness','Vulnerability'],
                data: personality2.Neuroticism.scorelist,
                color: colors[4]
            }
        },],
        browserData2 = [],
        versionsData2 = [],
        i2,
        j2,
        dataLen2 = data2.length,
        drillDataLen2,
        brightness2;


    // Build the data arrays
    for (i2 = 0; i2 < dataLen2; i2 += 1) {

        // add browser data
        browserData2.push({
            name: categories[i2],
            y: data2[i2].y,
            color: data2[i2].color
        });

        // add version data
        drillDataLen2 = data2[i2].drilldown.data.length;
        for (j2 = 0; j2 < drillDataLen1; j2 += 1) {
            brightness2 = 0.2 - (j2 / drillDataLen2) / 5;
            versionsData2.push({
                name: data2[i2].drilldown.categories[j2],
                y: data2[i2].drilldown.data[j2],
                color: Highcharts.Color(data2[i2].color).brighten(brightness2).get()
            });
        }
    }

     $('#container3').highcharts({
        chart: {
            type: 'pie'
        },
        title: {
            text: 'Hillary Clinton: Big 5 Personality'
        },
        // subtitle: {
        //     text: 'Source: <a href="http://netmarketshare.com/">netmarketshare.com</a>'
        // },
        yAxis: {
            title: {
                text: 'Total Scores'
            }
        },
        plotOptions: {
            pie: {
                shadow: false,
                center: ['50%', '50%']
            }
        },
        tooltip: {
            valueSuffix: '%'
        },
        series: [{
            name: 'Big 5',
            data: browserData1,
            size: '60%',
            dataLabels: {
                formatter: function () {
                    return this.y > 0.1 ? this.point.name : null;
                },
                color: '#ffffff',
                distance: -30
            }
        }, {
            name: '',
            data: versionsData1,
            size: '80%',
            innerSize: '60%',
            dataLabels: {
                formatter: function () {
                    // display only if larger than 1
                    return this.y > 0.05 ? '<b>' + this.point.name + '</b> ': null;
                }
            }
        }]
     });

     $('#container4').highcharts({
        chart: {
            type: 'pie'
        },
        title: {
            text: 'Donald Trump: Big 5 Personality'
        },
        // subtitle: {
        //     text: 'Source: <a href="http://netmarketshare.com/">netmarketshare.com</a>'
        // },
        yAxis: {
            title: {
                text: 'Total Scores'
            }
        },
        plotOptions: {
            pie: {
                shadow: false,
                center: ['50%', '50%']
            }
        },
        tooltip: {
            valueSuffix: '%'
        },
        series: [{
            name: 'Big 5',
            data: browserData2,
            size: '60%',
            dataLabels: {
                formatter: function () {
                    return this.y > 0.1 ? this.point.name : null;
                },
                color: '#ffffff',
                distance: -30
            }
        }, {
            name: '',
            data: versionsData2,
            size: '80%',
            innerSize: '60%',
            dataLabels: {
                formatter: function () {
                    // display only if larger than 1
                    return this.y > 0.05 ? '<b>' + this.point.name + '</b> ' : null;
                }
            }
        }]
     });
   }
    
});



