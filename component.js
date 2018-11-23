randomCharacter = function() {
  let possible = "abcdefghijklmnopqrstuvwxyz0123456789";
  return possible[Math.floor(Math.random() * possible.length)];
};

randomBool = function() {
  let possible = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0];
  return possible[Math.floor(Math.random() * possible.length)] === 1;
};

norm = function (i, l) {
  if (i > l) {
    i = i - l;
  }
  return (i === 0) ? 1 : i;
}

short = function() {
  let out = [],
    str,
    min = 5;

  for (let i = 0; i < min; i++) {
    str = this.randomCharacter();
    str = this.randomBool() ? str.toUpperCase() : str;
    out.push(str);
  }
  return out.join("");
};

findGetParameter = function(parameterName) {
  var result = null,
    tmp = [];
  var items = window.location.search.substr(1).split("&");
  for (var index = 0; index < items.length; index++) {
    tmp = items[index].split("=");
    if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
  }
  return result;
};

Date.dateDiff = function(datepart, diff) {
  datepart = datepart.toLowerCase();
  let divideBy = {
    w: 604800000,
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000
  };

  return Math.floor(diff / divideBy[datepart]);
};

function mid(max, min) {
  return (max - min) / 2;
}
function center(max, min) {
  return mid(max, min) + min;
}

const app = angular.module("drummachineApp", []);
/*  BUG

Attack doesn't work after the first playback of a sound (Chrome)
- https://github.com/alemangui/pizzicato/issues/80

*/
app.controller("DmController", function($scope, $compile) {
  const d = this;

  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBt_VQC9YWeaP0fOgfGTjssYV706d4nvlo",
    authDomain: "multirhythmdrummachine-9aa88.firebaseapp.com",
    databaseURL: "https://multirhythmdrummachine-9aa88.firebaseio.com",
    projectId: "multirhythmdrummachine-9aa88",
    storageBucket: "multirhythmdrummachine-9aa88.appspot.com",
    messagingSenderId: "985602133680"
  };

  firebase.initializeApp(config);

  d.db = firebase.database();
  d.db
    .ref("patterns/")
    .orderByChild("when")
    .on("value", data => {
      updateArea = $("#update-area");
      updateArea.empty();

      if (data.exists()) {
        data = Object.values(data.val());

        let bytime = data.slice(0);
        bytime.sort(function(a, b) {
          let x = a.when;
          let y = b.when;
          return x > y ? -1 : x < y ? 1 : 0;
        });

        bytime.forEach(function(value) {
          id = value.id;
          when = value.when;
          label = "Pattern";

          today = Date.now();
          diff = today - when;

          if (Date.dateDiff("d", diff) >= 15) {
            when = Date.dateDiff("w", diff) + " weeks ago";
          } else if (Date.dateDiff("h", diff) >= 49) {
            when = Date.dateDiff("d", diff) + " days ago";
          } else if (Date.dateDiff("m", diff) >= 121) {
            when = Date.dateDiff("h", diff) + " hours ago";
          } else if (Date.dateDiff("s", diff) >= 121) {
            when = Date.dateDiff("m", diff) + " minutes ago";
          } else if (Date.dateDiff("s", diff) >= 2) {
            when = Date.dateDiff("s", diff) + " seconds ago";
          } else {
            label = "New";
            when = "now";
          }

          var $el = $(
            '<div class="white-button" data-ng-click="load(\'' +
              id +
              "')\">" +
              "<p>" +
              label +
              " <strong>" +
              id +
              "</strong>" +
              "<br><small>" +
              when +
              "</small>" +
              "</p></div>"
          ).appendTo("#update-area");
          $compile($el)($scope);
        });
      }
    });

  // MOUSE SENS. ~ px Value
  const MAXMOUSEMOVE = 200;
  const MINMOUSEMOVE = -MAXMOUSEMOVE;
  // VOLUME ~ dB Value
  const MAXVOLUME = 10;
  const MINVOLUME = 0;
  const CENVOLUME = center(MAXVOLUME, MINVOLUME);
  // TEMPO ~ BPM Value
  const DEFAULTTEMPO = 120;
  const MAXTEMPO = 300;
  const MINTEMPO = 40;
  // TONE ~ Hz Value
  const MAXTONE = 2000;
  const MINTONE = 130;
  const CENTONE = center(MAXTONE, MINTONE);
  // KNOB ROTATIONS ~ degree Value
  const MAXROTATION = 125;
  const MINROTATION = -MAXROTATION;

  const stdKnob = mid(MAXROTATION, MINROTATION) / MAXMOUSEMOVE; // std knob rotation 125deg
  const stdVol = mid(MAXVOLUME, MINVOLUME) / MAXMOUSEMOVE; // std volume
  const stdTone = mid(MAXTONE, MINTONE) / MAXMOUSEMOVE; // std tone

  var playing = false; // play/stop
  var timeOutPlay = null; // playing timeout
  var indexClock = 1; // index clock position

  var tempTempo = 0;
  var oldTempTempo = -1;
  var avgTempTempo = [0, 0, 0, 0, 0, 0];

  d.trackSelected = 0; // index track selected
  d.verseSelected = 0; // index verse selected
  d.tempo = DEFAULTTEMPO;
  d.statusText = "PLAY";

  /*    beat obj. {
            text: signature
            rate: quantity of 1/32 to reach current signature
            ms: milliseconds default value x BPM conversion
      */
  d.beat = {
    4:  { id: 4,  offset:8,  text: "1/4",  rate: 8, ms: 60000 },
    8:  { id: 8,  offset:16, text: "1/8",  rate: 4, ms: 30000 },
    16: { id: 16, offset:32, text: "1/16", rate: 2, ms: 15000 },
    32: { id: 32, offset:64, text: "1/32", rate: 1, ms: 7500 }
  };

  d.tuning = {
    index: null,
    item: null,
    mouse: { init: null, mod: null },
    value: { init: null, mod: null }
  };
  d.mixing = {
    index: null,
    item: null,
    mouse: { init: null, mod: null },
    value: { init: null, mod: null }
  };
  d.tempoS = {
    item: null,
    mouse: { init: null, mod: null },
    value: { init: null, mod: null },
    initRotation: null
  };

  $scope.loadAudio = function(path) {
    return (sound = new Pizzicato.Sound({
      source: "file",
      options: {
        path: path,
        attack: 0,
        sustain: 0,
        release: 0.4
      }
    }));
  };

  //    [row]     [columns]
  // instruments    beats
  let emptySteps = [
    { id: 0, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 1, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 2, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 3, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 4, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 5, clock: 1, view: { x: 1, y: 16 }, beat: d.beat[8], matrix: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] }
  ];

  d.instruments = [
    {
      text: "Bass Drum",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/Kick/808-Kick.wav")
    },
    {
      text: "Snare Drum",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/Snare/808-Snare.wav")
    },
    {
      text: "Mid Tom",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/Tom/808-MidTom.wav")
    },
    {
      text: "Rim Shot",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/Rim/808-Rim.wav")
    },
    {
      text: "Closed Hihat",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/HitHat/808-ClosedHitHat.wav")
    },
    {
      text: "Crash Cymbal",
      mute: false,
      vol: 5,
      audio: $scope.loadAudio("./Audio/808/Crash/808-Crash.wav")
    }
  ];

  d.patterns = [{ id: 0, verse: [emptySteps, emptySteps, emptySteps] }];

  $(document).ready(function() {
    // usefull in the future
    let c = Pizzicato.context;
    let analyser = c.createAnalyser();
    d.instruments.forEach(function(value) {
      value.audio.connect(analyser);
    });

    $(window).resize(function() {
      if ($(window).width() < 1542) {
        $("#main-area").width(
          $(window).width() - ($("#control-area").width() + 23)
        );
      }
    });

    $(window).trigger("resize");

    $(document).on("click touchend", ".fa-cog, .fa-times", function() {
      item = $(this)
        .parent()
        .parent()
        .parent();
      times = document.querySelectorAll(".fa-times");
      if ($(this).hasClass("fa-cog") && times.length >= 1) {
        $(".line-set").removeClass("select");
        times.forEach(function(value) {
          value.classList.remove("fa-times");
          value.classList.add("fa-cog");
        });
      }
      if (item[0].classList.toggle("select")) {
        $(this)
          .removeClass(["fa-cog", "fa"])
          .addClass(["fa-times", "fa"]);
      } else {
        $(this)
          .removeClass(["fa-times", "fa"])
          .addClass(["fa-cog", "fa"]);
      }
    });

    // Init verse
    $scope.changeVerse();

    loadPat = findGetParameter("p");
    if (loadPat !== null) {
      $scope.load(loadPat);
    }

    // Display visualization
    $("body").fadeIn("slow");
  });

  /**  TEMPO functions
   *
   *
   *
   * **/

  $scope.tempo = function() {
    return d.tempo;
  };

  $scope.setTempo = function(x = 120) {
    d.tempo = x;
  };

  $scope.detectTempo = function() {
    let avg = 0;
    let now = Math.floor(Date.now());

    if (tempTempo && tempTempo >= now - 3000) {
      avgTempTempo.forEach(function(value, index) {
        if (value !== 0) {
          avg += value;
        } else {
          avg += now - tempTempo;
          avgTempTempo[index] = now - tempTempo;
        }
      });
    } else {
      // Reset vector
      avgTempTempo.forEach(function(value, index) {
        avgTempTempo[index] = 0;
      });
    }

    tempTempo = now;
    avg = avg / avgTempTempo.length;
    oldTempTempo = (oldTempTempo + 1) % avgTempTempo.length;
    avgTempTempo[oldTempTempo] = 0;

    if (avg) $scope.setTempo(Math.trunc(60000 / avg));
  };

  $scope.incTempo = function(inc) {
    xT = $scope.tempo();
    xT = inc ? (xT += 1) : (xT -= 1);
    $scope.setTempo(xT);
  };

  $scope.setBeat = function(inst, inc) {
    let oldbeat = d.patterns[0].verse[d.verseSelected][inst].beat.id;
    let newbeat = oldbeat;
    // Controls on new beat
    newbeat = inc ? newbeat * 2 : newbeat / 2;
    newbeat = newbeat === 2 ? 32 : newbeat;
    newbeat = newbeat === 64 ? 4 : newbeat;
    // New Beat
    d.patterns[0].verse[d.verseSelected][inst].beat = d.beat[newbeat];

    // Add or reduce steps
    let newoffset = d.patterns[0].verse[d.verseSelected][inst].beat.offset;
    // Create temp array replacing the old one
    let tempmatrix = Array(newoffset).fill(0);

    // Shift active steps
    d.patterns[0].verse[d.verseSelected][inst].matrix.forEach(function (val, index, array) {
      let i2, distance = 0;

      if (newbeat > oldbeat) {
        // If we are increasing the beat speed
        distance = (newbeat/oldbeat);
        i2 = index*distance;
        tempmatrix[i2] = (array[index] === 1) ? 1 : 0;

      } else {
        // If we are reducing the beat speed
        distance = (oldbeat/newbeat);
        i2 = (index%distance) ? (index-1)/distance : index/distance;
        if (array[index] && tempmatrix[i2] === 0) {
          tempmatrix[i2] = 1;
        }
      }
    });
    console.log(tempmatrix)

    // Update Matrix
    d.patterns[0].verse[d.verseSelected][inst].matrix = tempmatrix;
    // New offset
    d.patterns[0].verse[d.verseSelected][inst].view.y = newoffset;

    updateSteps()
  };

  $scope.setOffset = function(inst, inc) {
    let newoffset = d.patterns[0].verse[d.verseSelected][inst].view.y;
    let maxOffset = d.patterns[0].verse[d.verseSelected][inst].beat.offset;

    newoffset = inc ? (newoffset += 1) : (newoffset -= 1);
    newoffset = newoffset < 1 ? 1 : newoffset;
    newoffset = newoffset > maxOffset ? maxOffset : newoffset;
    if (newoffset <= maxOffset) {
      $("#inst-" + inst + " div.line-steps .button-step").removeClass("disabled");

      for (var i = newoffset + 1; i <= maxOffset; i++) {
        $("#inst-" + inst + " div.line-steps #step-" + i).addClass("disabled");
      }
    }
    d.patterns[0].verse[d.verseSelected][inst].view.y = newoffset;
  };

  $scope.setVolume = function(index, inc) {
    let newvol = d.instruments[index].vol;
    newvol = inc ? (newvol += 1) : (newvol -= 1);
    newvol = newvol <= 0 ? 0 : newvol;
    newvol = newvol >= 10 ? 10 : newvol;
    d.instruments[index].vol = newvol;

    if (d.instruments[index].mute) {
      d.instruments[index].audio.volume = 0;
    } else {
      d.instruments[index].audio.volume = newvol / MAXVOLUME;
    }
  };

  $scope.save = function() {
    let id = short();
    // copy verseSelected
    verse = JSON.parse(JSON.stringify(d.patterns[0].verse[d.verseSelected]));
    // normalize the verse setting every clock to 0
    verse.forEach(function(value) {
      value.clock = 1;
    });

    let file = JSON.stringify(verse);
    let when = Date.now();
    let hash = md5(file);

    // check if there is duplicated pattern
    d.db
      .ref("patterns")
      .orderByChild("hash")
      .equalTo(hash)
      .on("value", snapshot => {
        // pattern is new
        if (!snapshot.exists()) {
          d.db.ref("patterns/" + id).set(
            {
              id: id,
              hash: hash,
              when: when,
              json: file,
              star: 0,
              title: "Example"
            },
            function(error) {
              if (error) {
                // The write failed...
              } else {
                // Data saved successfully!
              }
            }
          );
        } else {
        }
      });
  };

  $scope.load = function(key) {
    d.db.ref("patterns/" + key).on("value", snapshot => {
      if (snapshot.exists()) {
        // Data read successfully!
        let data = snapshot.val();
        d.patterns[0].verse[d.verseSelected] = JSON.parse(data.json);
        $scope.$watch("message", updateSteps());
      } else {
        // The read failed...
      }
    });
  };

  /**  STEPS functions
   *
   *
   *
   * **/

  $scope.selectStep = function(instN, step) {

    let item = $("#inst-" + instN + " div.line-steps #step-" + (step+1));
    d.patterns[0].verse[d.verseSelected][instN].matrix[step] = item[0].classList.toggle("select") ? 1 : 0;
    console.log('step=' + step, d.patterns[0].verse[d.verseSelected][instN].matrix)
  };

  $scope.changeVerse = function(index = 0) {
    d.verseSelected = index;
    $(".verse").removeClass("select");
    $("#verse-" + d.verseSelected).addClass("select");
    $scope.$watch("message", updateSteps());
  };

  $scope.clear = function() {
    d.patterns[0].verse[d.verseSelected].forEach(function(value) {
      value.matrix[d.trackSelected] = 0;
    });
    $scope.selectStep(d.trackSelected);
  };

  /**  MIX functions
   *
   *
   *
   * **/

  $scope.checkMix = function() {
    d.instruments.forEach(function(value) {
      if (value.audio != null && !value.mute)
        value.audio.volume = value.vol / MAXVOLUME;
    });
  };

  $scope.mute = function() {
    d.instruments[d.trackSelected].mute = !d.instruments[d.trackSelected].mute;
    d.instruments[d.trackSelected].audio.volume = d.instruments[d.trackSelected].mute ? 0.0 : d.instruments[d.trackSelected].vol / 100;
  };

  /**  PLAYING functions
   *
   *
   *
   * **/
  $scope.resetClock = function() {
    d.patterns[0].verse[d.verseSelected].forEach(function(value) {
      value.clock = 1;
      value.view.y = Math.abs(value.view.x - value.view.y) + 1;
      value.view.x = 1;
      updateSteps()
    });
  };

  $scope.startLoop = function() {
    playing = !playing;

    if (!playing) {
      // STOP

      // reset indexClock
      indexClock = 1;
      // reset instrument clock
      $scope.resetClock();
      // clear loop timeout
      clearTimeout(timeOutPlay);
      // clean graphics change
      $(".button-step").removeClass("clock");
      // change status text
      d.statusText = "START";
    } else {
      // PLAY

      // check instruments volume
      $scope.checkMix();
      // play loop
      $scope.play();
      // change status text
      d.statusText = "STOP";
    }
  };

  $scope.play = function() {
    // playing sounds
    d.instruments.forEach(function(value, index) {
      // clock is in time with beat rate
      if ( indexClock % d.patterns[0].verse[d.verseSelected][index].beat.rate === 1) {
        $scope.playInst(index, d.patterns[0].verse[d.verseSelected][index]);
      }
    });

    // inc global clock value
    indexClock = norm((indexClock + 1), d.beat[32].beat);

    // timeout loop
    timeOutPlay = window.setTimeout(function() {
      $scope.play();
    }, d.beat[32].ms / $scope.tempo());
  };

  // Play the single instrument in own beat tempo
  $scope.playInst = function(index, element) {
    let beat = element.beat.offset;
    let offset = 0;

    // calculate the offset
    if (element.view.x > element.view.y) {
      offset = norm((beat - element.view.x) + 1 + element.view.y, beat);
    }  else {
      offset = norm((element.view.y - element.view.x) + 1, beat);
    }
    // calculate the view points
    if ((beat - offset) > 0) {
      if (norm((element.view.y + 1), beat) === element.clock) {

        if (norm((element.view.y + 1), beat) === element.clock) {
          element.view.x = norm((element.view.x + offset), beat);
          element.view.y = norm((element.view.y + offset), beat);
          updateSteps();
        }
      }
    }


    if (element.matrix[element.clock-1]) {

      if (d.instruments[index].audio.playing) {
        d.instruments[index].audio.stop();
      }
      d.instruments[index].audio.play();
    }

    // select clock step on instrument line steps
    $("#inst-" + index + " div.line-steps > .button-step").removeClass("clock");
    $("#inst-" + index + " div.line-steps #step-" + (element.clock)).addClass("clock");

    // inc clock instrument value
    element.clock = norm((element.clock + 1), beat);
  };

  let updateSteps = () => {
    let cverse = d.patterns[0].verse[d.verseSelected];

    cverse.forEach(function(value, idline) {
      let linesteps = $("#inst-" + cverse[idline].id + " .line-steps");
      // Render different width x beat-type
      linesteps.removeClass('beat-4 beat-8 beat-16 beat-32');
      linesteps.addClass('beat-' + cverse[idline].beat.id);

      let step = linesteps.children();

      for (var index=1; index < cverse[idline].matrix.length; index++) {
        value = cverse[idline].matrix[index];

        if (cverse[idline].view.x > cverse[idline].view.y) {
          if ((index+1) > cverse[idline].view.y) {
            // if window is fixed from end to the start
            if ((index + 1) < cverse[idline].view.x) {
                $(step[index]).addClass("disabled");
              } else {
                $(step[index]).removeClass("disabled");
              }
            } else {
              $(step[index]).removeClass("disabled");
            }
        } else {
            // if window is fixed from start to the end
            if ((index+1) < cverse[idline].view.x) {
                $(step[index]).addClass("disabled");
            } else if ((index + 1) > cverse[idline].view.y) {
                $(step[index]).addClass("disabled");
            } else {
              $(step[index]).removeClass("disabled");
            }
        }

        if (value === 1) {
          $(step[index]).addClass("select");
        } else {
          $(step[index]).removeClass("select");
        }
      }
    });
  };
});
