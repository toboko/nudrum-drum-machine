toastr.options.progressBar = true;
toastr.options.closeButton = true;

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
};

rshft = function(arr, places) {
  for (var i = 0; i < places; i++) {
    arr.unshift(arr.pop());
  }
};

lshft = function(arr, places) {
  for (var i = 0; i < places; i++) {
    arr.push(arr.shift());
  }
};

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

  d.storage = firebase.storage();

  d.db = firebase.database();

  // On load update latest samples link
  // TODO: Save this in cache. If not exists download over firebase
  d.db.ref("samples/").on("value", data => {
    if (data.exists()) {
      let ones = true;
      let types = Object.entries(data.val());
      types.forEach(function (type) {
        $("#inst-sound-type").append('<optgroup id="group-' + type[0] + '" label="' + type[0] + '"></optgroup>');
        let elements = Object.entries(type[1]);
        elements.forEach(function (element) {
          if (ones) {
            $('#group-' + type[0]).append('<option selected="selected" name="' + element[0] + '" value="' + type[0] + '/' + element[0] + '.wav' + '">'+ type[0] + ' ' + element[0] + '</option>');
            ones = false;
          } else {
            $('#group-' + type[0]).append('<option name="' + element[0] + '" value="' + type[0] + '/' + element[0] + '.wav' + '">'+ type[0] + ' ' + element[0] + '</option>');

          }
        })
      });
    }
  });

  // On load update latest pattern uploaded
  d.db.ref("patterns/").orderByChild("when").on("value", data => {
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
            '<div class="white-button" data-ng-click="load(\'' +id +"')\">" +
            "<p>" +label +" <strong>" +id +"</strong>" +
            "<br><small>" +when +"</small>" +
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
  // TEMPO ~ BPM Value
  const DEFAULTTEMPO = 120;
  const MAXTEMPO = 300;
  const MINTEMPO = 40;
  // TONE ~ Hz Value
  const MAXTONE = 2000;
  const MINTONE = 130;
  // KNOB ROTATIONS ~ degree Value
  const MAXROTATION = 125;
  const MINROTATION = -MAXROTATION;

  var playing = false; // play/stop
  var toutPly = null; // playing timeout
  var fxIdClk = {state: false, inst: 0}; // fix clock while beat change
  var idxClk = 1; // index clock position

  var tTempo = 0;
  var lstTempo = -1;
  var avgTempo = [0, 0, 0, 0, 0, 0];

  d.trackSelected = 0; // index track selected
  d.tempo = DEFAULTTEMPO;
  d.plyTxt = "PLAY";

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

  d.defSamples = [
    "Kick/Classic.wav",
    "Snare/Classic.wav",
    "Tom/ClassicMid.wav",
    "Rim/Classic.wav",
    "HitHat/ClassicClose.wav",
    "Crash/Classic.wav",
  ];

  //    [row]     [columns]
  // instruments    beats
  d.pattern = Array(
    { id: 0, inst: { text: "Bass Drum", mute: false, vol: 5, audio: null }, clock: 1, view: 3, ended: false, cycle: 0, beat: d.beat[4], steps: [0,0,0,0,0,0,0,0] },
    { id: 1, inst: { text: "Snare Drum", mute: false, vol: 5,  audio: null }, clock: 1, view: 16, ended: false, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 2, inst: { text: "Mid Tom", mute: false, vol: 5,  audio: null }, clock: 1, view: 32, ended: false, cycle: 0, beat: d.beat[16], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 3, inst: { text: "Rim Shot", mute: false, vol: 5, audio: null }, clock: 1, view: 64, ended: false, cycle: 0, beat: d.beat[32], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 4, inst: { text: "Closed Hihat", mute: false, vol: 5, audio: null }, clock: 1, view: 16, ended: false, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    { id: 5, inst: { text: "Crash Cymbal", mute: false, vol: 5, audio: null  }, clock: 1, view: 16, ended: false, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] }
  );

	d.newpattern = {
	  id: d.pattern.length, inst: { text: '', mute: false, vol: 5, audio: null }, clock: 1, view: 16, ended: false, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
	};

	$scope.loadSample = function(sample, inst) {
		d.storage.ref(sample).getDownloadURL().then(function (url) {
			d.pattern[inst].inst.audio = (new Pizzicato.Sound({
				source: "file",
				options: {
					path: url,
					attack: 0,
					release: 0.4
				}
			}));

			// Remove blur on loading
			let filterVal = 'blur(0px)';
			$('#set-' + inst + ' > p')
				.css('filter',filterVal)
				.css('webkitFilter',filterVal)
				.css('mozFilter',filterVal)
				.css('oFilter',filterVal)
				.css('msFilter',filterVal)
				.css('pointer-events', 'visible');
			$("#inst-" + inst + " .line-steps")
				.css('filter',filterVal)
				.css('webkitFilter',filterVal)
				.css('mozFilter',filterVal)
				.css('oFilter',filterVal)
				.css('msFilter',filterVal)
				.css('pointer-events', 'visible');
		});
	};

	$scope.loadAllSample = function() {
		d.defSamples.forEach(function (value, index) {
			$scope.loadSample(value, index);
		})
	};

  $(document).ready(function() {
    // usefull in the future
    // let c = Pizzicato.context;
    // let analyser = c.createAnalyser();
    // d.instruments.forEach(function(value) {
    //   value.audio.connect(analyser);
    // });

    // $(window).resize(function() {
    //   if ($(window).width() < 1542) {
    //     $("#main-area").width(
    //       $(window).width() - ($("#control-area").width() + 23)
    //     );
    //   }
    // });
    $(window).trigger("resize");

    $(document).on("click touchend", ".fa-edit, .fa-times", function() {
      item = $(this).parent().parent().parent();
      times = document.querySelectorAll(".fa-times");
      if ($(this).hasClass("fa-edit") && times.length >= 1) {
        $(".line-set").removeClass("select");
        times.forEach(function(value) {
          value.classList.remove("fa-times");
          value.classList.add("fa-edit");
        });
      }
      if (item[0].classList.toggle("select")) {
        $(this).removeClass(["fa-edit", "fa"]).addClass(["fa-times", "fa"]);
      } else {
        $(this).removeClass(["fa-times", "fa"]).addClass(["fa-edit", "fa"]);
      }
    });

    loadPat = findGetParameter("p");
    if (loadPat !== null) {
      $scope.load(loadPat);
    } else {
      $scope.loadAllSample();
    }

    // Display visualization
    $("body").fadeIn("slow");

  });


  /**  TEMPO functions
   *
   *
   *
   * **/

  $scope.setTempo = function(x = 120) {
    d.tempo = x;
  };

  $scope.detectTempo = function() {
    let avg = 0;
    let now = Math.floor(Date.now());

    if (tTempo && tTempo >= now - 3000) {
      avgTempo.forEach(function(value, index) {
        if (value !== 0) {
          avg += value;
        } else {
          avg += now - tTempo;
          avgTempo[index] = now - tTempo;
        }
      });
    } else {
      // Reset vector
      avgTempo.forEach(function(value, index) {
        avgTempo[index] = 0;
      });
    }

    tTempo = now;
    avg = avg / avgTempo.length;
    lstTempo = (lstTempo + 1) % avgTempo.length;
    avgTempo[lstTempo] = 0;

    if (avg) $scope.setTempo(Math.trunc(60000 / avg));
  };

  $scope.incTempo = function(inc) {
    xT = d.tempo;
    xT = inc ? (xT += 1) : (xT -= 1);
    $scope.setTempo(xT);
  };

  $scope.setBeat = function(inc, inst) {
    let flupt   = false;
    let oldbeat = (typeof inst !== 'undefined') ? d.pattern[inst].beat.id : d.newpattern.beat.id;
    let newbeat = oldbeat;
    // Controls on new beat
    newbeat = inc ? newbeat * 2 : newbeat / 2;
    newbeat = newbeat === 2 ? 32 : newbeat;
    newbeat = newbeat === 64 ? 4 : newbeat;

    // Add or reduce steps
    let newoffset = d.beat[newbeat].offset;
    // Create temp array replacing the old one
    let tempsteps = Array(newoffset).fill(0);

    if (typeof inst !== 'undefined') {
      // Shift active steps
      d.pattern[inst].steps.forEach(function (val, index, array) {
        let i2, distance = 0;

        if (newbeat > oldbeat) {
          // If we are increasing the beat speed
          distance = (newbeat/oldbeat);
          i2 = index*distance;
          tempsteps[i2] = (array[index] === 1) ? 1 : 0;

        } else {
          flupt = true;
          // If we are reducing the beat speed
          distance = (oldbeat/newbeat);
          i2 = (index%distance) ? (index-1)/distance : index/distance;
          if (array[index] && tempsteps[i2] === 0) {
            tempsteps[i2] = 1;
          }
        }
      });

      // New Beat
      d.pattern[inst].beat = d.beat[newbeat];
      // Update Matrix
      d.pattern[inst].steps = tempsteps;
      // New offset
      d.pattern[inst].view = (d.pattern[inst].view > newoffset) ? newoffset : d.pattern[inst].view;
      // Update Inst Clock
      d.pattern[inst].clock = norm(Math.ceil(idxClk / d.pattern[inst].beat.rate), d.pattern[inst].beat.offset);
      fxIdClk.state = true;
      fxIdClk.inst  = inst;

      $scope.resetSteps(d.pattern[inst]);
      $scope.upClock(inst, d.pattern[inst].clock);

      if (flupt) updateSteps(inst);

    } else {
      // New Beat
      d.newpattern.beat = d.beat[newbeat];
      // Update Matrix
      d.newpattern.steps = tempsteps;
      // New offset
      d.newpattern.view = newoffset;
    }
  };

  $scope.setOffset = function(inc, inst) {

    let newoffset = (typeof inst !== 'undefined') ? d.pattern[inst].view : d.newpattern.view;
    let maxoffset = (typeof inst !== 'undefined') ? d.pattern[inst].beat.offset : d.newpattern.beat.offset;

    newoffset = inc ? (newoffset += 1) : (newoffset -= 1);
    newoffset = newoffset < 1 ? 1 : newoffset;
    newoffset = newoffset > maxoffset ? maxoffset : newoffset;

    if (typeof inst !== 'undefined') {

      if (newoffset <= maxoffset) {
        $("#inst-" + inst + " div.line-steps .button-step").removeClass("disabled");

        for (var i = newoffset + 1; i <= maxoffset; i++) {
          $("#inst-" + inst + " div.line-steps #step-" + i).addClass("disabled");
        }
      }
      d.pattern[inst].view = newoffset;

    } else {

      d.newpattern.view = newoffset;
    }
  };

  $scope.setVolume = function(index, inc) {
    let newvol = d.instruments[index].vol;
    newvol = inc ? (newvol += 1) : (newvol -= 1);
    newvol = newvol <= 0 ? 0 : newvol;
    newvol = newvol >= 10 ? 10 : newvol;
    d.pattern[index].inst.vol = newvol;

    if (d.pattern[index].inst.mute) {
      d.pattern[index].inst.audio.volume = 0;
    } else {
      d.pattern[index].inst.audio.volume = newvol / MAXVOLUME;
    }
  };

  $scope.save = function() {
    let id = short();
    // copy pattern
    let pattern = JSON.parse(JSON.stringify(d.pattern));
    // normalize the pattern
    // - clock to 0
    // - audio to null
    pattern.forEach(function(value) {
      value.clock = 1;
      value.inst.audio = null
    });
	  pattern = JSON.stringify(pattern);

	  let samples = JSON.stringify(d.defSamples);
    let when = Date.now();
    let hash = md5(pattern);

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
              pattern: pattern,
              samples: samples,
              star: 0,
              title: "Example"
            },
            function(error) {
              if (error) {
	              // The write failed...
	              toastr.error('error', 'Error!');
              } else {
	              // Data saved successfully!
	              toastr.success('Pattern uploaded with id <strong>' + id + '</strong>', 'Success');
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
        d.pattern = JSON.parse(data.pattern);
        d.defSamples = JSON.parse(data.samples);

        $scope.loadAllSample();
        $scope.resetClock();
        updateSteps();
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

  $scope.selectStep = function(inst, step) {
    let item = $("#inst-" + inst + " div.line-steps #step-" + (step+1));
    d.pattern[inst].steps[step] = item[0].classList.toggle("select") ? 1 : 0;
  };

  $scope.clear = function(inst) {
	  d.pattern[inst].steps.forEach(function(value, index, array) { array[index] = 0; });
	  updateSteps(inst);
  };

  /**  MIX functions
   *
   *
   *
   * **/

  $scope.checkMix = function() {
    d.pattern.forEach(function(value) {
      if (value.inst.audio != null && !value.mute)
        value.inst.audio.volume = value.vol / MAXVOLUME;
    });
  };

  $scope.mute = function(inst) {
    d.pattern[inst].inst.mute = !d.pattern[inst].inst.mute;
    d.pattern[inst].inst.audio.volume = d.pattern[inst].inst.mute ? 0.0 : d.pattern[inst].inst.vol / 10;
    if (d.pattern[inst].inst.mute) {
	    $('#set-' + inst + ' .mute').html('<i class="fas fa-volume-mute"></i>')
    } else {
	    $('#set-' + inst + ' .mute').html('<i class="fas fa-volume-up"></i>')
    }
  };

  /**  PLAYING functions
   *
   *
   *
   * **/
  $scope.resetSteps = function( inst ) {
    for (x = inst.steps.length; x > 0; x--) {
      $("#inst-" + inst.id + " #step-" + x).prependTo("#inst-" + inst.id + " .line-steps")
    }
  };

  $scope.resetClock = function( element ) {
    let verse = (typeof element !== 'undefined') ? element : d.pattern;
    verse.forEach(function(inst) {
      inst.clock = 1;
      inst.cycle  = 0;
      // Shift left steps to restore the original position
      $scope.resetSteps(inst)
    });
  };

  $scope.startLoop = function() {
    playing = !playing;

    if (!playing) {
      // STOP

      // reset indexClock
      idxClk = 1;
      // reset instrument clock
      $scope.resetClock();
      // clear loop timeout
      clearTimeout(toutPly);
      // clean graphics change
      $(".button-step").removeClass("clock");
      // change status text
      d.plyTxt = "START";

      updateSteps();

    } else {
      // PLAY

      // check instruments volume
      $scope.checkMix();
      // play loop
      $scope.play();
      // change status text
      d.plyTxt = "STOP";
    }
  };

  $scope.play = function() {
    // playing sounds
    d.pattern.forEach(function(value, inst) {

      // clock is in time with beat rate
      if ( idxClk % value.beat.rate === 1) {
        $scope.playInst(inst, d.pattern[inst]);

      } else if(value.beat.rate === 1) {
        $scope.playInst(inst, d.pattern[inst]);
      }
    });

    // inc global clock value
    idxClk = norm((idxClk + 1), d.beat[32].offset);

    // timeout loop
    toutPly = window.setTimeout(function() {
        $scope.play();
      },(d.beat[32].ms ) / d.tempo);
  };

  // Play the single instrument in own beat tempo
  $scope.playInst = function(inst, element) {
    let beat = element.beat.offset;
    let offset = element.view;

    // calculate the points of view

    if (element.steps[element.clock - 1]) {
      if (d.pattern[inst].inst.audio.playing) {
        d.pattern[inst].inst.audio.stop();
      }
      // Play sample
      d.pattern[inst].inst.audio.play();
    }

    if (element.ended && (offset !== beat)) {

      //let fstep = $("#inst-" + inst + " #step-1");

	    for (let x = element.beat.offset; x > (element.beat.offset - element.view); x--) {
		    let line = $("#inst-" + inst + " .button-step");
		    $("#inst-" + inst + " .line-steps").prepend(line.last());
	    }

      // Shift elements animation
      //   fstep.animate(
      //     { marginLeft : fstep.width() * element.view},
      //     {
      //       duration: d.beat[32].ms / d.tempo,
      //       start: function () {
      //         for (var x = 0; x < element.view; x++) {
      //           let line = $("#inst-" + inst + " .button-step");
      //
      //           line.last().hide();
      //           $("#inst-" + inst + " .line-steps").prepend(line.last());
      //         }
      //
      //       },
      //       complete: function () {
      //         let line = $("#inst-" + inst + " .button-step");
      //
      //         $("#inst-" + inst + " #step-1").removeAttr("style");
      //         for (var x = 0; x < element.view; x++) {
      //           $(line[x]).show()
      //         }
      //       }
      //   });
        element.ended = false;
    }


    // select clock step on instrument line steps
    $scope.upClock(inst, element.clock);

    // inc clock instrument value
    if (fxIdClk.state && fxIdClk.inst === inst) {
      fxIdClk.state = false;
      element.clock = norm(Math.ceil(idxClk / element.beat.rate) + 1, offset);

    } else {
      element.clock = norm((element.clock + 1), offset);
    }

    if (element.clock === 1) {
      // Counting the cycle
      element.cycle = (element.cycle += 1);
      element.ended = true;
    }
  };


  $scope.newInst = function () {
	  let nameinst = $("#inst-new-name").val();

	  if (nameinst === '') {
		  toastr.error('<strong>Name</strong> is required!', 'Missing!');

    } else {
		  d.newpattern.inst.text = nameinst;
		  d.pattern.push(d.newpattern);
		  d.newpattern = { id: d.pattern.length, inst: { text: '', mute: false, vol: 5, audio: null }, clock: 1, view: 16, ended: false, cycle: 0, beat: d.beat[8], steps: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] };

		  let urlinst = $("#inst-sound-type").val();

		  d.defSamples.push(urlinst);

		  $scope.loadSample(urlinst, d.pattern.length - 1);

    }
  };

  $scope.upClock = function (inst, step) {
    if (playing) {
      // Update clock status on instruments's steps
      $("#inst-" + inst + " div.line-steps > .button-step").removeClass("clock");
      $("#inst-" + inst + " div.line-steps #step-" + step).addClass("clock");
    }
  };

  let updateSteps = function (inst) {
    let patterns = (typeof inst !== 'undefined') ? Array(d.pattern[parseInt(inst)]): d.pattern;

    patterns.forEach(function(pattern) {
	    let linesteps = $("#inst-" + pattern.id + " .line-steps");
      // Blur instruments on loading
      if (pattern.inst.audio === null) {

	      let filterVal = 'blur(5px)';
	      $('#set-' + pattern.id + ' > p')
		      .css('filter',filterVal)
		      .css('webkitFilter',filterVal)
		      .css('mozFilter',filterVal)
		      .css('oFilter',filterVal)
		      .css('msFilter',filterVal)
          .css('pointer-events', 'none');
	      linesteps
		      .css('filter',filterVal)
		      .css('webkitFilter',filterVal)
		      .css('mozFilter',filterVal)
		      .css('oFilter',filterVal)
		      .css('msFilter',filterVal)
          .css('pointer-events', 'none');
      }
      // Render different width x beat-type
      linesteps.removeClass('beat-4 beat-8 beat-16 beat-32');
      linesteps.addClass('beat-' + pattern.beat.id);

      let step = linesteps.children();

      for (let a = 0; a < pattern.steps.length; a++) {
        if (a > (pattern.view - 1)) {
          $(step[a]).addClass("disabled");

        } else {
          $(step[a]).removeClass("disabled");
        }

        if (pattern.steps[a] === 1) {
          $(step[a]).addClass("select");
        } else {
          $(step[a]).removeClass("select");
        }
      }
    });
  };


  $scope.$on('onRepeatLast', function(scope, element, attrs) {
    // Do some stuffs here
    let inst = parseInt($(element).parent().parent().attr('id').substr(5));
    updateSteps(inst)
  });
});

app.directive('onLastRepeat', function() {
  return function(scope, element, attrs) {
    if (scope.$last) {
      scope.$emit('onRepeatLast', element, attrs);
    }
  };
});

app.filter('range', function() {
  return function(input, total) {
    total = parseInt(total);

    for (var i=0; i<total; i++) {
      input.push(i);
    }

    return input;
  };
});