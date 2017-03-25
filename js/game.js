/*jslint browser: true, nomen: true, white: true*/
/*global $*/
/*global _*/
/*global L*/
/*global ga*/

'use strict';

var NewYorkGame = function() {
    this.movies = []; // movies to guess
    this.mapElements = []; // map elements
};

NewYorkGame.prototype.initializeInterface = function() {
    // Set up the map and tiles
    this.map = L.map('map', {
        zoomControl: false,
        keyboard: false
    });

    this.layer = L.tileLayer(
        'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        {
            maxZoom: NewYorkGame.maxZoom,
            minZoom: NewYorkGame.minZoom,
            noWrap: true,
            zIndex: 0
        }
    ).addTo(this.map);

    // Initial view
    this.map.fitWorld();
    this.map.panTo(NewYorkGame.mapCenter);

    // Register events
    this.map.on('click', _.bind(this.userClick, this));
    $('#start').click(_.bind(this.newGame, this));
    $('#tryagain').click(_.bind(this.newGame, this));

    // HTML elements
    this.$dialog = $('#dialog');
    this.$panel = $('#panel');
    this.$points = $('#points');
};

NewYorkGame.maxZoom = 6;
NewYorkGame.minZoom = 3;
NewYorkGame.mapCenter = L.latLng(40, -74);
NewYorkGame.moviesPerGame = 6;

NewYorkGame.prototype.currentMovie = function() {
    return this.movies[this.pointer];
};

NewYorkGame.prototype.showMovie = function() {
    var prefix;

    this.$panel.html(this.currentMovie().fullName);

    this.startTime = new Date().getTime();
    this.$panel.slideDown().css("background-image", "url('images/movies/"+ this.currentMovie().image +"')");
};

NewYorkGame.prototype.newGame = function() {
    this.removeMarkers();
    $('#tryagaincontainer').hide();

    // Select random movies
    this.movies = _(NewYorkGame.dbMovies)
        .sampleSize(NewYorkGame.moviesPerGame)
        .map(function(movie) {
            return {
                fullName: movie.movie ,
                image: movie.image,
                movie: movie.location,
                position: L.latLng(movie.lat, movie.lng)
            };
        }, this)
        .value();

    this.pointer = 0;

    this.resetMapView();
    this.showMovie();

    $('#map').addClass('crosshair');

    this.$dialog.hide();

    this.$panel.show();
    this.$panel.startAnimation('bounceIn');

};

NewYorkGame.prototype.showPoints = function() {
    var score, avgdist, sorted, bestmovie, highscore, text, strprevious;

    // Remove panel and current points from screen
    this.$points.slideUp();
    this.$panel.slideUp();

    $('#map').removeClass('crosshair');

    // Show all markers
    _.each(this.movies, function(movie) {
        this.showMarkers(movie, true);
    }.bind(this));

    // Score
    score = _.reduce(this.movies, function(sum, movie) {
        return sum + movie.points;
    }, 0);

    // Average and best distance:
    avgdist = Math.round(_.reduce(this.movies, function(sum, movie) {
        return sum + movie.distance;
    }, 0) / NewYorkGame.moviesPerGame);

    sorted = _.sortBy(this.movies, 'distance');
    bestmovie = _.first(sorted);

    // Highscore?
    highscore = localStorage.getItem('highscore');
    if (_.isString(highscore)) {
        highscore = parseInt(highscore, 10);
    }
    if (!_.isNumber(highscore)) {
        highscore = 0;
    }

    text = '<table>';
    if (score > highscore) {
        strprevious = '';
        if (highscore > 0) {
            strprevious = ' (Previous was ' + highscore.toString() + ' Points)';
        }
        text += '<tr><td><strong>New High Score!</strong></td><td>' + strprevious + '</td></tr>';
    } else if (highscore > 0) {
        text += '<tr><td>High Score</td><td>' + highscore.toString() + ' Points</td></tr>';
    }
    //text += '<tr><td>Average Distance</td><td>' + avgdist.toString() + 'km</td></tr>';
    text += '<tr><td>Guesses</td><td>';
    _.each(sorted, function(movie) {
        text += movie.fullName + " (" + movie.distance.toString() + ' km) <br />';
    });
    text += '</td></tr>';
    text += '</table>';

    if (score > highscore) {
        localStorage.setItem('highscore', score);
    }

    $('#title').html(score.toString() + ' points');
    $('#content').html(text);
    $('#introbutton').html('Try again');

    this.$dialog.show();
    this.$dialog.startAnimation('zoomIn');

};

NewYorkGame.prototype.isGameActive = function() {
    return !_.isEmpty(this.movies) && this.pointer < NewYorkGame.moviesPerGame;
};

NewYorkGame.prototype.removeMarkers = function() {
    if (!_.isUndefined(this.mapElements)) {
        _.forEach(this.mapElements, function(m) {
            this.map.removeLayer(m);
        }.bind(this));
    }
};

NewYorkGame.prototype.showMarkers = function(movie, gameOver) {
    var offset, movieMarker, guessMarker, content;

    offset = gameOver ? 45 : 0;

    var nycLocation = new L.LatLng(40.7305991, -73.9865811);

    this.mapElements.push(
        L.marker(nycLocation, {
        icon: NewYorkGame.Icons.nyc,
        clickable: gameOver,
        keyboard: false,
        title: movie.fullName,
        zIndexOffset: offset
    }).addTo(this.map)
        );

    movieMarker = L.marker(movie.position, {
        icon: NewYorkGame.Icons.movie,
        clickable: gameOver,
        keyboard: false,
        title: movie.fullName,
        zIndexOffset: offset
    }).addTo(this.map);

    guessMarker = L.marker(movie.guess, {
            icon: NewYorkGame.Icons.guess,
            clickable: false,
            keyboard: false,
            zIndexOffset: -offset
        }).addTo(this.map);

    this.mapElements.push(movieMarker);
    this.mapElements.push(guessMarker);

    this.mapElements.push(
        L.polyline([movie.guess, nycLocation], {color: 'orange', opamovie: 0.3}).addTo(this.map)
    );
    this.mapElements.push(
        L.polyline([movie.position, nycLocation], {color: 'green', opamovie: 0.3}).addTo(this.map)
    );
    this.mapElements.push(
        L.polyline([movie.guess, movie.position], {color: 'brown', opamovie: 0.6}).addTo(this.map)
    );

    this.map.setView(NewYorkGame.mapCenter, NewYorkGame.minZoom, {
        animation: true
    });

    if (gameOver) {
        // Add popup with information
        content = '<div class="moviePopup">';
        content += '<h5>' + movie.fullName + '</h5>';
        content += '<img src="images/movies/' + movie.image + '" class="poster" />';

        content += '<table>';
        content += '<tr><td>Distance</td><td>' + movie.distance.toString() + ' km</td></tr>';
        content += '<tr><td>Time</td><td>' + (Math.round(movie.time / 100) / 10).toString() + 's</td></tr>';
        content += '<tr><td>Points</td><td>' + movie.points.toString() + '</td></tr>';
        content += '</table>';
        content += '</div>';
        movieMarker.bindPopup(content, { closeButton: false, autoPan: true });
        guessMarker.bindPopup(content, { closeButton: false, autoPan: true });
    }
};

NewYorkGame.prototype.resetMapView = function() {
    this.map.setView(NewYorkGame.mapCenter, NewYorkGame.minZoom, {
        animation: true
    });
};

NewYorkGame.prototype.userClick = function(e) {
    var time, movie, points, dist, multiplier, pointsHTML;

    if (!this.isGameActive()) {
        this.$dialog.slideUp();
        $('#tryagaincontainer').show();

        return true;
    }

    time = (new Date().getTime()) - this.startTime;

    movie = this.currentMovie();
    movie.guess = e.latlng;
  //movie.guess = L.latLng(parseFloat(e.latlng.lat), parseFloat(e.latlng.lng));

    // Calculate points
    points = 0;

    // Distance in kilometers
    dist = Math.round(movie.guess.distanceTo(movie.position) / 1000);

    if (dist < 30) { // Consider this exact
        points = 2000;
    } else if (dist < 1500) {
        points = 1500 - dist;
    }

    multiplier = 1;
    if (time < 1000) {
        multiplier = 1.4;
    } else if (time < 2000) {
        multiplier = 1.3;
    } else if (time < 3000) {
        multiplier = 1.2;
    } else if (time < 5000) {
        multiplier = 1.1;
    }

    points *= multiplier;
    points = Math.round(points);

    pointsHTML = "<span>" + movie.fullName + " was filmed in " + movie.movie + "!</span><br />";
    // Show points on screen
    if (points > 0) {
        pointsHTML = pointsHTML + points.toString() + " points";
    } else {
        pointsHTML = pointsHTML + "Zero points";
    }

    this.$points
        .html(pointsHTML)
        .startAnimation('bounceIn');

    // Save for stats
    movie.distance = dist;
    movie.points = points;
    movie.time = time;

    this.pointer += 1;
    if (this.isGameActive()) {
        this.showMarkers(movie, false);
        this.$panel.slideUp();

        _.delay(_.bind(function() {
            this.resetMapView();
            // Show guess and solution on the map
            this.removeMarkers();
            this.$points.hide();

            // Show next movie in panel
            this.showMovie();
        }, this), 2500);
    } else {
        // Game over!
        this.showMarkers(movie, false);
        this.$panel.slideUp();

        _.delay(_.bind(function() {
            this.showPoints();
            this.resetMapView();
        }, this), 2500);
    }

    return true;
};

// font-awesome
L.AwesomeMarkers.Icon.prototype.options.prefix = 'fa';

NewYorkGame.Icons = {
    guess: L.AwesomeMarkers.icon({
        icon: 'question-circle',
        markerColor: 'orange'
    }),
    movie: L.AwesomeMarkers.icon({
        icon: 'check',
        markerColor: 'green'
    }),
    nyc: L.AwesomeMarkers.icon({
        icon: 'building-o',
        markerColor: 'gray'
    })
};

$.fn.extend({
    startAnimation: function(animateClass) {
        var classes = 'animated ' + animateClass;

        // we use the hide/show in between to actually reset the CSS animation
        this.removeClass(classes)
            .hide()
            .addClass(classes)
            .show();

        return this;
    }
});


$(document).ready(function() {
    var game = new NewYorkGame();

    game.initializeInterface();

    // Load JSON data (countries and movies)
    $.getJSON('data/data.json').done(function(movies) {
        NewYorkGame.dbMovies = movies;

        $('#dialog').show();
        $('#tryagaincontainer').hide();

    });

});
