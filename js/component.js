toastr.options.progressBar = true;
toastr.options.closeButton = true;

const app = angular.module("drummachineApp", []);
/*  BUG

Attack doesn't work after the first playback of a sound (Chrome)
- https://github.com/alemangui/pizzicato/issues/80

*/

app.controller("DmController", function ($scope, $compile) {
  const d = this;

  // Initialize Firebase
  const configDb = {
    apiKey: "AIzaSyCPrwHHgupU8jXdlnuulh9_yTYn-Ry2Gqc",
    authDomain: "nudrum-app.firebaseapp.com",
    databaseURL: "https://nudrum-app.firebaseio.com",
    projectId: "nudrum-app",
    storageBucket: "nudrum-app.appspot.com",
    messagingSenderId: "1098853194105"
  };

  firebase.initializeApp(configDb);

  const storage = firebase.storage();
  const db = firebase.database();

  // On load update latest pattern uploaded
  db.ref("patterns/").orderByChild("when").on("value", data => {
    let latestPattern = document.getElementById('latest-pattern');
    latestPattern.innerHTML = '';

    if (data.exists()) {
      data = Object.values(data.val());

      let bytime = data.slice(0);
      bytime.sort(function (a, b) {
        let x = a.when;
        let y = b.when;
        return x > y ? -1 : x < y ? 1 : 0;
      });

      bytime.forEach(function (value) {
        let id = value.id;
        let title = value.title
        let when = value.when;

        let today = Date.now();
        let diff = today - when;

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
          when = "now";
        }

        let child = document.createElement('div');
        child.classList.add('line-set-large', 'click');
        child.innerHTML = '<div class="line-set-large click">' +
          '<div class="grid-area-a" data-ng-click="load(\'' + id + "')\">" +
          "<p><i class=\"fas fa-caret-right\"></i> <strong>[" + id + "]</strong> <small>" + when + "</small> " +
          "<br>" + title + "</p></div>";
        let $el = latestPattern.appendChild(child);
        $compile($el)($scope);
      });
    } else {
      let child = document.createElement('div');
      child.classList.add('line-set-large', 'click');
      child.innerHTML = '<div class="grid-area-a"><p>No Patterns</p></div>';
      let $el = latestPattern.appendChild(child);
      $compile($el)($scope);
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

  let playing = false; // play/stop
  let toutPly = null; // playing timeout
  let idxClk = 1; // index clock position

  let tTempo = 0;
  let lstTempo = -1;
  let avgTempo = [0, 0, 0, 0, 0, 0];

  d.trkOn = null; // index track selected
  d.sampleOn = '';
  d.tempo = DEFAULTTEMPO;
  d.plyTxt = document.getElementById('play');
  d.maxoffset = 64; // def maxoffset can be modified
  d.copyTemp = null;

  d.beat = {
    8: {id: 8, offset: 8, ms: 60000},
    7: {id: 7, offset: 8, ms: 52500},
    5: {id: 5, offset: 5, ms: 37500},
    4: {id: 4, offset: 16, ms: 30000},
    3: {id: 3, offset: 3, ms: 22500},
    2: {id: 2, offset: 32, ms: 15000},
    1: {id: 1, offset: 64, ms: 7500}
  };

  d.samples = Array();
  d.pattern = Array();

  d.defsamples = Array(
    "Kick/Classic.wav",
    "Snare/Classic.wav",
    "Tom/ClassicMid.wav",
    "Rim/Classic.wav",
  );

  d.defpattern = Array(
    {
      inst: {text: "Bass Drum", mute: false, vol: 5, audio: null},
      clock: 1,
      view: 16,
      shift: 0,
      cycle: 0,
      beat: d.beat[4],
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      inst: {text: "Snare Drum", mute: false, vol: 5, audio: null},
      clock: 1,
      view: 16,
      shift: 0,
      cycle: 0,
      beat: d.beat[4],
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      inst: {text: "Closed Hihat", mute: false, vol: 5, audio: null},
      clock: 1,
      view: 16,
      shift: 0,
      cycle: 0,
      beat: d.beat[4],
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      inst: {text: "Crash Cymbal", mute: false, vol: 5, audio: null},
      clock: 1,
      view: 16,
      shift: 0,
      cycle: 0,
      beat: d.beat[4],
      steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  );

  $scope.$watch('$viewContentLoaded', function () {
    let body = document.body, html = document.documentElement;
    let h = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    let w = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);

    $scope.initSearch();
    // 118 (bottom bar) + 252 (upper side latest-pattern) + 54 (top distance) + 6 (extra)
    document.getElementById('latest-pattern').style.height = (h - 380) + 'px';
    // fade in
    body.classList.remove('fade');
    // play with spacebar
    window.addEventListener('keydown', function (e) {
      if (e.keyCode == 32 &&
        e.target !== this.document.getElementById('inst-new-name') &&
        e.target !== this.document.getElementById('pattern-new-name') &&
        e.target !== this.document.getElementById('pattern-load-name')) {
        $scope.startLoop();
      }
    });
    // prevent spacebar scroll on #latest-pattern
    window.addEventListener('keydown', function (e) {
      if (e.keyCode == 32 && e.target == document.body) {
        e.preventDefault();
      }
    });
    // load url pattern
    let loadPat = findGetParameter("p");

    if (loadPat !== null) {
      $scope.load(loadPat);
    } else {
      $scope.load('default');
    }
  });

  $(window).resize(function () {
    let body = document.body, html = document.documentElement;
    let h = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
    $scope.$apply(function () {
      document.getElementById('latest-pattern').style.height = (h - 380) + 'px';
    });
  });

  $scope.initSearch = function () {
    // On load update latest samples link
    db.ref("samples/").once("value", data => {
      if (data.exists()) {
        let ones = true,
          sample,
          folder,
          $el,
          types = Object.entries(data.val());

        types.forEach(function (type, index) {
          folder = document.createElement('div');
          folder.classList.add('white-button', 'folder');
          if (index === 0) folder.classList.add('selected');
          folder.setAttribute('ng-click', 'searchFolder(\'' + type[0] + '\')');
          folder.setAttribute('id', type[0]);

          folder.innerHTML = '<p>' + type[0] + '</p>';

          $el = document.getElementById("folders").appendChild(folder);
          $compile($el)($scope);

          if (ones) {
            $scope.searchFolder(type[0]);
            ones = false;
          }
        });
      }
    });
  }

  $scope.searchFolder = function (value) {
    db.ref("samples/" + value).on("value", data => {

      if (data.exists()) {
        let ones = true,
          sample,
          $el,
          file,
          types = Object.entries(data.val());

        document.getElementById('folders').querySelectorAll('.folder').forEach(function (value) {
          value.classList.remove('selected');
        });
        document.getElementById(value).classList.add('selected')

        // Upload button
        document.getElementById('samples').innerHTML = '';
        sample = document.createElement('div');
        sample.classList.add('white-button');
        sample.innerHTML = '<p ng-click="uploadSample(\'' + value + '\')"><i class="fas fa-upload" ng></i> Upload to "' + value + '"</p><input id="input-file-upload" type="file"/>';

        $el = document.getElementById('samples').appendChild(sample);
        $compile($el)($scope);

        // Samples
        types.forEach(function (element) {
          // extract file name
          file = element[1].url;
          file = file.substr(file.indexOf(value) + value.length + 3, file.length)
          file = file.substr(0, file.indexOf('?'));
          // append file
          sample = document.createElement('div');
          sample.classList.add('white-button', 'sample')
          sample.setAttribute('data-sample', value + '/' + file)
          sample.setAttribute('ng-click', 'selectSample($event)')

          sample.innerHTML = '<p>' + element[0] + '</p>';

          $el = document.getElementById('samples').appendChild(sample);
          $compile($el)($scope);
        });
      }
    });
  }

  $scope.selectSample = function (event) {
    document.getElementById('samples').querySelectorAll('.sample').forEach(function (value) {
      value.classList.remove('selected');
    });
    d.sampleOn = event.currentTarget.getAttribute('data-sample');
    event.currentTarget.classList.add('selected');
    $scope.playDemoSample(d.sampleOn);
  }

  $scope.uploadSample = function (path) {
    // File or Blob named mountains.jpg
    let file = document.getElementById('input-file-upload').files[0];
    if (typeof file === 'undefined' || file === null) {
      toastr.warning('Select an audio file to start the upload');
      return false;
    }

    // Create the file metadata
    let metadata = {
      contentType: file.type
    };
    let str = file.name;
    let fileName = str.split(' ').join('_');

    // Upload file and metadata to the object 'images/mountains.jpg'
    let uploadTask = storage.ref(path).child(fileName).put(file, metadata);

    // Listen for state changes, errors, and completion of the upload.
    uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
      function (snapshot) {
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            toastr.warning('Upload is paused');
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            toastr.info('Upload is running');
            break;
        }
      }, function (error) {

        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case 'storage/unauthorized':
            toastr.error('User doesn\'t have permission to access the object');
            break;

          case 'storage/canceled':
            // User canceled the upload
            toastr.error('User canceled the upload');
            break;

          case 'storage/unknown':
            toastr.error('Unknown error occurred');
            break;
        }
      }, function () {
        // Upload completed successfully, now we can get the download URL
        uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
          let fileNameDb = fileName.replace(/\.[^/.]+$/, "");
          db.ref("samples/" + path + '/' + fileNameDb).set({url: downloadURL},
            function (error) {
              if (error) {
                // The write failed...
                toastr.error('Unknown error during the upload');
              } else {
                // Data saved successfully!
                toastr.success('Sample uploaded', 'Success');
              }
            }
          );
        });
      });
  }

  $scope.playDemoSample = function (sample) {
    toastr.options.timeOut = 1;
    toastr.info('Loading demo audio sample');
    storage.ref(sample).getDownloadURL().then(function (url) {
      let audio = new Audio(url);
      audio.play();
    });
  }

  $scope.loadSample = function (sample, inst) {
    storage.ref(sample).getDownloadURL().then(function (url) {
      d.pattern[inst].inst.audio = (
        new Pizzicato.Sound({
          source: "file",
          options: {
            path: url,
            attack: 0,
            release: 0.4
          }
        })
      );


      setTimeout(function () {
        let set = document.getElementById("inst-" + inst);
        let filterVal = 'blur(0px)';
        // Remove loading icon
        set.querySelector(".fa-2x").style.zIndex = '-1';
        // Remove blur on loading
        set.querySelectorAll(".line-steps").forEach(function (value) {
          value.style.filter = filterVal;
          value.style.webkitFilter = filterVal;
          value.style.pointerEvents = 'visible'
        });

        $scope.resetClock(inst);
        $scope.updateStepsRoot(inst);
      }, 500)


    }).catch(function (error) {
      // Handle any errors
      toastr.error([sample, error.code].join(' '), error.name);
    });
  };

  $scope.loadAllSample = function () {
    d.samples.forEach(function (value, index) {
      $scope.loadSample(value, index);
    })
  };

  /**  TEMPO functions
   *
   *
   *
   * **/

  $scope.detectTempo = function () {
    let avg = 0;
    let now = Math.floor(Date.now());

    if (tTempo && tTempo >= now - 3000) {
      avgTempo.forEach(function (value, index) {
        if (value !== 0) {
          avg += value;
        } else {
          avg += now - tTempo;
          avgTempo[index] = now - tTempo;
        }
      });
    } else {
      // Reset vector
      avgTempo.forEach(function (value, index) {
        avgTempo[index] = 0;
      });
    }

    tTempo = now;
    avg = avg / avgTempo.length;
    lstTempo = (lstTempo + 1) % avgTempo.length;
    avgTempo[lstTempo] = 0;

    if (avg) d.tempo = (Math.trunc(60000 / avg));
  };

  $scope.incTempo = function (inc) {
    let xT = d.tempo;
    xT = inc ? (xT += 1) : (xT -= 1);
    d.tempo = xT;
  };

  /* Edit Functions



   */

  $scope.setBeat = function (inc, inst) {
    if (playing) {
      toastr.warning('Beat cannot be set while playing', 'Beat Rules')
    } else {
      let newbeat = d.pattern[inst].beat.id;
      let basebeat = null;
      let basebeat_occurs = [];
      // Controls on new beat
      newbeat = inc ? newbeat += 1 : newbeat -= 1;
      newbeat = newbeat === 0 ? 8 : newbeat; // round inc
      newbeat = newbeat === 9 ? 1 : newbeat; // round inc
      if (newbeat === 6) newbeat = inc ? newbeat += 1 : newbeat -= 1; // skip number 6

      //  - prevent multi odd time
      // if exists an instrument with an odd time we save it to limit user selection because
      // grid has a limited size and multiple odd time like: 5,7,4 need a wide grid built by
      // a 1/140 unit (lcm of 5,7,4)
      d.pattern.forEach(function (element, index) {
        if (element.beat.id !== 1 && element.beat.id % 2) {
          basebeat = element.beat.id;
          if (index !== inst) {
            basebeat_occurs.push(index); // in order to skip single odd time
          }
        }
      });

      if (basebeat !== null && newbeat % 2) {
        if (newbeat !== 1 && basebeat_occurs.length > 0 && newbeat !== basebeat) {
          newbeat = inc ? newbeat += 1 : newbeat -= 1;
        }
        // skip number 6
        if (newbeat === 6) {
          newbeat = inc ? newbeat += 1 : newbeat -= 1;
        }
      }

      d.pattern[inst].beat = d.beat[newbeat];

      $scope.updateBeat();
    }
  };

  $scope.updateBeat = function (noView = false) {
    let lcm_beats = [];
    let odd = false;
    let lcm = 1;
    let sol = 0;
    let len = 0;

    d.pattern.forEach(function (element) {
      lcm_beats.push(element.beat.id);

      if (lcm_beats.length === 2) {
        lcm = math.lcm(lcm_beats[0], lcm_beats[1]);
        lcm_beats = [];
        lcm_beats.push(lcm);
      }

      // check if there is an odd time
      if (element.beat.id % 2) {
        if (element.beat.id !== 1) odd = true;
      }
    });

    d.maxoffset = lcm;

    // if an odd time
    if (odd) {
      // smallest tatum must be >= 1/13
      while (d.maxoffset < 13) {
        d.maxoffset += d.maxoffset;
      }
      // if an even time
    } else {
      // smallest tatum must be >= 1/64
      while (d.maxoffset < 60) {
        d.maxoffset += d.maxoffset;
      }
    }

    // resize instruments grid
    d.pattern.forEach(function (element, index) {
      sol = d.maxoffset / element.beat.id;

      element.beat.offset = sol;
      if (!noView) {
        element.view = sol;
      }


      if (element.steps.length !== sol) {
        if (element.steps.length > sol) {
          //reduce
          element.steps = element.steps.splice(0, sol);

        } else {
          //increase
          len = element.steps.length
          element.steps.length = sol;
          element.steps.fill(0, len);

        }
      }
    });
  };

  $scope.setOffset = function (inc, inst) {
    let pattern = d.pattern[inst];

    if (playing) {
      toastr.warning('Offset cannot be set while playing', 'Offset Rules')

    } else {
      let newOffset = pattern.view;
      let offset = pattern.beat.offset;

      newOffset = inc ? (newOffset * 2) : (newOffset / 2);
      newOffset = newOffset < 3 ? 3 : newOffset;
      newOffset = newOffset > offset ? offset : newOffset;
      newOffset = Math.round(newOffset);

      pattern.view = newOffset;
      $scope.updateStepsRoot(inst)
    }
  };

  $scope.setVolume = function (inc, inst) {
    let newvol = d.pattern[inst].inst.vol;
    newvol = inc ? (newvol += 1) : (newvol -= 1);
    newvol = newvol <= 0 ? 0 : newvol;
    newvol = newvol >= 10 ? 10 : newvol;
    d.pattern[inst].inst.vol = newvol;

    if (d.pattern[inst].inst.mute) {
      d.pattern[inst].inst.audio.volume = 0;
    } else {
      d.pattern[inst].inst.audio.volume = newvol / MAXVOLUME;
    }
  };

  $scope.shift = function (inc, inst) {
    let pattern = d.pattern[inst];
    let temp = pattern.steps;
    let acc = Array(pattern.beat.offset - pattern.view).fill(0)
    let sliced = temp.slice(0, pattern.view);

    if (inc) {
      pattern.shift = (pattern.shift += 1);
      rshft(sliced, 1);
    } else {
      pattern.shift = (pattern.shift -= 1);
      lshft(sliced, 1);
    }

    if (pattern.shift > (pattern.view - 1) || pattern.shift < (-pattern.view + 1)) {
      pattern.shift = 0;
    }

    pattern.steps = sliced.concat(acc);

    $scope.updateStepsRoot(inst);
  }

  $scope.shiftL = function (inst) {
    let pattern = d.pattern[inst];

    lshft(pattern.steps, 1);
    pattern.shift = (pattern.shift -= 1);

    if (pattern.shift < -pattern.view) {
      pattern.shift = 0;
    }

    $scope.updateStepsRoot(inst);
  }

  $scope.delete = function (inst) {
    d.pattern.splice(inst, 1);
    d.samples.splice(inst, 1)
    d.trkOn = 0;

    if (d.pattern.length === 0) {
      $scope.closeEditArea();
      d.maxoffset = 64;
    }
    $scope.updateStepsRoot()
  };

  $scope.select = function (inst) {
    if (inst !== null) {
      if (d.trkOn !== inst) {
        document.getElementById('edit-set-' + inst).style.display = 'grid';
        d.trkOn = inst;
      } else {
        d.trkOn = null;
      }
    } else {
      d.trkOn = null;
    }
  };

  $scope.closeEditArea = function () {
    let el = document.getElementById('edit-area');
    el.classList.add('slide-left');
    setTimeout(function () {
      el.style.display = 'none';
    }, 50);
  };

  $scope.closeNavigateArea = function () {
    let el = document.getElementById('navigate');
    el.classList.add('slide-right');
    setTimeout(function () {
      el.style.display = 'none';
    }, 500);
  };

  $scope.closeBrowseArea = function () {
    let el = document.getElementById('browse-area');
    el.classList.add('slide-right');
    setTimeout(function () {
      el.style.display = 'none';
    }, 50);
  };

  $scope.openNavigateArea = function () {
    let el = document.getElementById('navigate');
    el.style.display = null;
    setTimeout(function () {
      el.classList.remove('slide-right');
    }, 50);
  };

  $scope.openBrowseArea = function () {
    let el = document.getElementById('browse-area');
    el.style.display = null;
    setTimeout(function () {
      el.classList.remove('slide-right');
    }, 50);
  };

  /* Pattern Functions




   */

  $scope.save = function () {
    let id = short();
    // copy pattern
    let pattern = JSON.parse(JSON.stringify(d.pattern));
    if (pattern.length <= 0) {
      toastr.warning('<strong>Pattern</strong> cannot be empty');
      return 0;
    }
    // normalize the pattern
    // - clock to 0
    // - audio to null
    pattern.forEach(function (value) {
      value.clock = 1;
      value.inst.audio = null
    });
    pattern = JSON.stringify(pattern);

    let samples = JSON.stringify(d.samples);
    let when = Date.now();
    let hash = md5(pattern);
    let title = short(24);
    let tempo = d.tempo;

    if (title === '') {
      toastr.warning('<strong>Name</strong> is required');

    } else {
      // check if there is duplicated pattern
      db.ref("patterns").orderByChild("hash").equalTo(hash).on("value", snapshot => {
        const payload = {
          id: id,
          hash: hash,
          tempo: tempo,
          when: when,
          pattern: pattern,
          samples: samples,
          star: 0,
          title: title
        }
        // pattern is new
        if (!snapshot.exists()) {
          db.ref("patterns/" + id).set(
            payload,
            function (error) {
              if (error) {
                // The write failed...
                toastr.error(error, 'Error!');
              } else {
                // Data saved successfully!
                toastr.success('Pattern uploaded with id <strong>' + id + '</strong>', 'Success');
              }
            }
          );
        } else {
          toastr.warning('<strong>Pattern</strong> already exists');
        }
      });
    }
  };

  $scope.load = function (key) {
    key = (typeof key !== 'undefined') ? key : document.getElementById('pattern-load-name').value;

    if (key === '') {
      toastr.warning('<strong>Pattern Code</strong> is required')

    } else if (key === 'default') {
      d.pattern = d.defpattern
      d.samples = d.defsamples;

      $scope.loadAllSample();

    } else {
      db.ref("patterns/" + key).on("value", snapshot => {
        if (snapshot.exists()) {
          if (playing) {
            // Stop Playing
            $scope.startLoop();
          }
          // Data read successfully!
          let data = snapshot.val();

          d.pattern = []
          d.pattern = JSON.parse(data.pattern);
          // Why this code is here?
          // If try to load a pattern through url angular will not $apply changes
          // this is best/worst solution I've found
          if (!$scope.$$phase) {
            $scope.$apply()
          }

          d.samples = JSON.parse(data.samples);
          d.tempo = data.tempo;

          // Blur loading tracks
          d.pattern.forEach(function (val, inst) {
            if (document.getElementById("inst-" + inst) !== null) {
              let set = document.getElementById("inst-" + inst)
              let filterVal = 'blur(5px)';

              // Add loading icon
              set.querySelector(".fa-2x").style.zIndex = '1';
              // Blur instruments on loading
              set.querySelectorAll('.line-steps').forEach(function (value) {
                value.style.filter = filterVal;
                value.style.webkitFilter = filterVal;
                value.style.pointerEvents = 'none'
              });
            }
          });

          $scope.loadAllSample();
          $scope.updateBeat(true);

        } else {
          // The read failed...
        }
      });
    }
  };

  /**  STEPS functions
   *
   *
   *
   * **/
  $scope.selectStep = function (inst, step) {
    let item = document.getElementById("inst-" + inst).querySelector("#step-" + (step + 1));
    d.pattern[inst].steps[step] = item.classList.toggle("select") ? 1 : 0;
  };

  $scope.clear = function (inst) {
    d.pattern[inst].steps.forEach(function (value, index, array) {
      array[index] = 0;
    });
    $scope.updateStepsRoot(inst);
  };

  $scope.copy = function (inst) {
    d.copyTemp = jQuery.extend(true, {}, d.pattern[inst]);
    toastr.info('Pattern Copy', 'Done!');
  };

  $scope.paste = function (inst) {
    if (playing) {
      toastr.warning('Patterns cannot be paste while playing', 'Pattern Rules')
    } else {
      d.pattern[inst].steps = d.copyTemp.steps.slice(0);
      d.pattern[inst].shift = d.copyTemp.shift;
      d.pattern[inst].beat = d.copyTemp.beat;
      d.pattern[inst].view = d.copyTemp.view;
      $scope.updateStepsRoot(inst);
    }
  };

  /**  MIX functions
   *
   *
   *
   * **/
  $scope.existAudio = function () {
    let out = true;
    d.pattern.every(function (value) {
      if (value.inst.audio === null) {
        out = false;
        return false;
      }
      return true;
    });
    return out;
  };

  $scope.checkMix = function () {
    d.pattern.forEach(function (value) {
      if (value.inst.audio != null && !value.inst.mute) {
        value.inst.audio.volume = value.inst.vol / MAXVOLUME;
      }
    });
  };

  $scope.mute = function (inst) {
    if (d.pattern[inst].inst.mute) {
      d.pattern[inst].inst.mute = false;
      d.pattern[inst].inst.audio.volume = d.pattern[inst].inst.vol / MAXVOLUME;
      document.getElementById('inst-' + inst).querySelector('.mute').innerHTML = '<i class="fas fa-volume-up"></i>';

    } else {
      d.pattern[inst].inst.mute = true;
      d.pattern[inst].inst.audio.mute = true;
      d.pattern[inst].inst.audio.volume = 0.0;
      document.getElementById('inst-' + inst).querySelector('.mute').innerHTML = '<i class="fas fa-volume-mute"></i>';
    }
  };

  /**  PLAYING functions
   *
   *
   *
   * **/
  $scope.resetClock = function (inst) {
    let patterns = (typeof inst !== 'undefined') ? Array(inst) : d.pattern;
    patterns.forEach(function (element, index) {
      element.inst.audio.stop();
      if (element.view < element.beat.offset) {
        // Shift left steps to restore the original position
        lshft(element.steps, element.cycle * element.view)
      }
      element.cycle = 0;
      element.clock = 1;
    });
  };

  $scope.startLoop = function () {
    if ($scope.existAudio()) {
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
        document.querySelectorAll('.button-step').forEach(function (value) {
          value.classList.remove('clock');
        })
        // change status text
        d.plyTxt.classList.remove('fa-stop');
        d.plyTxt.classList.add('fa-play');

        $scope.updateStepsRoot();

      } else {
        // PLAY

        // check instruments volume
        $scope.checkMix();
        // play loop
        $scope.play();
        // change status text
        d.plyTxt.classList.remove('fa-play');
        d.plyTxt.classList.add('fa-stop');
      }
    } else {
      toastr.warning('Samples are loading', 'Loading')

    }
  };

  $scope.play = function () {
    // playing sounds
    d.pattern.forEach(function (value, inst) {

      // clock is in time with beat rate
      if (idxClk % value.beat.id === 1) {
        $scope.playInst(inst, d.pattern[inst]);

      } else if (value.beat.id === 1) {
        $scope.playInst(inst, d.pattern[inst]);
      }
    });

    // inc global clock value
    idxClk = normal((idxClk + 1), d.maxoffset);

    // timeout loop
    toutPly = window.setTimeout(function () {
      $scope.play();
    }, (d.beat[1].ms) / d.tempo);
  };

  // Play the single instrument in own beat tempo
  $scope.playInst = function (inst, element) {
    let beat = element.beat.offset;
    let view = element.view;

    let tcycle = normal(element.clock, view);    // Identify when a cycle finished
    let tbeat = normal(element.clock, beat); 	 // Identify the clock position on the steps


    if (element.steps[tbeat - 1]) {
      if (element.inst.audio.playing) {
        element.inst.audio.stop();
      }
      // Play sample
      element.inst.audio.play();
    }

    if ((tcycle === 1) && (element.cycle !== 0) && (view !== beat)) {
      // Update UI
      $scope.updateStepsRoot(inst);
    }

    // select clock step on instrument line steps
    $scope.upClock(inst, tbeat);

    // inc clock instrument value
    element.clock = (element.clock += 1);

    tcycle = normal(element.clock, view);

    if (tcycle === 1) {
      // Counting the cycle
      element.cycle = (element.cycle += 1);

      if (view !== beat) {
        // Right shift elements array
        rshft(element.steps, view);
      }
    }

  };


  $scope.newInst = function () {
    let name = document.getElementById('inst-new-name').value;

    if (playing) {
      toastr.warning('Instruments cannot be created while playing', 'Instrument Rules')
    } else {

      if (name === '') {
        toastr.warning('<strong>Name</strong> is required');

      } else if (d.sampleOn === '' || d.sampleOn === null) {
        toastr.warning('Select an <strong>Instrument</strong> from the library');

      } else {

        let newpattern = null;

        if (d.pattern[0]) {
          let newbeat = d.pattern[0].beat;
          let newview = d.pattern[0].view;
          let newsteps = d.pattern[0].steps.slice(0);

          newpattern = {
            inst: {text: name, mute: false, vol: 5, audio: null},
            clock: 1,
            view: newview,
            shift: 0,
            cycle: 0,
            beat: newbeat,
            steps: newsteps
          };
        } else {
          newpattern = {
            inst: {text: name, mute: false, vol: 5, audio: null},
            clock: 1,
            view: 16,
            shift: 0,
            cycle: 0,
            beat: d.beat[4],
            steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          };
        }

        d.pattern.push(newpattern);
        d.samples.push(d.sampleOn);

        $scope.loadSample(d.sampleOn, d.pattern.length - 1);

        d.sampleOn = ''
        document.getElementById('inst-new-name').value = ''
      }
    }
  };

  $scope.upClock = function (inst, step) {
    if (playing) {
      // Update clock status on instruments's steps
      let el = document.getElementById("inst-" + inst)
      el.querySelectorAll(".button-step").forEach(function (value) {
        value.classList.remove('clock')
      });
      el.querySelector("#step-" + step).classList.add('clock');
    }
  };

  $scope.updateStepsRoot = function (inst) {
    d.pattern.every(function (pattern, index) {
      if (typeof inst !== 'undefined') {
        if (index === inst) {
          updateSteps(pattern, inst);
          return false;
        }
        return true;
      } else {
        updateSteps(pattern, index);
        return true;
      }
    });
  };

  let updateSteps = function (pattern, inst) {
    let set = document.getElementById("inst-" + inst)
    let steps = set.querySelectorAll(".button-step");
    let filterVal = 'blur(5px)';

    // Blur instruments on loading
    if (pattern.inst.audio === null) {
      // Add loading icon
      set.querySelector(".fa-2x").style.zIndex = '1';

      set.querySelectorAll('.line-steps').forEach(function (value) {
        value.style.filter = filterVal;
        value.style.webkitFilter = filterVal;
        value.style.pointerEvents = 'none'
      });
    }

    for (let a = 0; a < pattern.steps.length; a++) {

      if (pattern.view < pattern.beat.offset) {
        let x = normal(pattern.view * pattern.cycle, pattern.beat.offset, false);
        let y = normal((pattern.view * pattern.cycle) + pattern.view - 1, pattern.beat.offset, false);

        if (y < x) {
          if (a > y && a < x) {
            steps[a].classList.add("disabled");

          } else {
            steps[a].classList.remove("disabled");
          }
        } else {
          if (a < x || a > y) {
            steps[a].classList.add("disabled");

          } else {
            steps[a].classList.remove("disabled");
          }
        }
      } else {
        if (a > (pattern.view - 1)) {
          steps[a].classList.add("disabled");

        } else {
          steps[a].classList.remove("disabled");
        }
      }

      if (pattern.steps[a] === 1) {
        steps[a].classList.add("select");
      } else {
        steps[a].classList.remove("select");
      }
    }
  };

  $scope.$on('onRepeatLast', function (scope, element, attrs) {
    // Do some stuffs here
    let inst = parseInt(element[0].parentElement.parentElement.getAttribute('id').substr(5));
    $scope.updateStepsRoot(inst)
  });
});

app.directive('onLastRepeat', function () {
  return function (scope, element, attrs) {
    if (scope.$last) {
      scope.$emit('onRepeatLast', element, attrs);
    }
  };
});