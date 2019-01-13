# NuDrum
The project aims to create a polirhythmic and polymetric drum machine, through a responsive web interface. These features are limiting to all the instruments available on a drum machine (physical or digital). NuDrum unlike the previous ones, makes every single instrument polyrhythm and polymetric, in order to improve the visual learning of the various rhythmic patterns created by the users using the platform. In addition, it will be available through Google's Firebase services, to upload your own samples to the platform and share rhythmic patterns with the audience.

**[Try NuDrum](https://nudrum.netlify.com/)**

### What is rhythm?
The sense of rhythm was developed in the early stages of hominid evolution by the
forces of natural selection to induce battle trance, promote the development of a defense system of early hominids. In Sub-Saharan Africa it evolved in complex forms such as multi-layered polyrhythm and simultaneous rhythms in more than one time signature. 

### What is polyrhythm?
A polyrhythm is the simultaneous use of two or more conflicting rhythms, that are not readily perceived as deriving from one another, or as simple manifestations of the same meter. It can be distinguished from irrational rhythms (tuplets), which can occur within the context of a single part

Click on the link to watch a [simple polyrhythm pattern](https://nudrum.netlify.com/?p=vR3O8) on NuDrum

### What is polymetric?
Rhythm in music is characterized by a repeating sequence of stressed and unstressed beats (strong vs. weak; upbeat vs. downbeat) and divided into bars organized by time signature and tempo indications. In music, time signature always occurs at start of a paper sheet, it represents the rhythm of the piece.

 **Tips** - *Usually, modern drum machine can be set on a single time signature forcing performer to play all the rhythm in a strict way.*

## How to music?

With NuDrum we can set different time signature (even or odd) and find new amazing pattern.

On the right of every instrument we can:

![NuDrum logo](/img/actio-menu.PNG) 

 1. Mute the track
 2. Clear the row
 3. Open the edit menu


The edit menu will slide from the left to the right, standing on the left margin of the screen. Here, we can choose from different options. 
In the first row (from the left to the right) we can:

![NuDrum logo](/img/edit-menu.PNG) 

1. **volume** - Change the volume
2. **offset** - Change the offset
3. **beat** - Change the notes duration

In the second row:
1. **shift** - Shift right (up arrow) or shift left (down arrow) the pattern.
2. **delete** - Delete the track

### How they works

Beat goes from: **4** to **8** to **16** to **32**. The beat represents notes duration [**4**] = 1/4 , [**8**] = 1/8 and so on. Default time signature is **4/4** but changing the offset it possible to turn the time. 


In a track with a beat duration of **4** we can have **8** possible offset.<br>
In a track with a beat duration of **8** we can have **16** possible offset and so on..


Examples: <br>
[Time in 5/4](https://nudrum.netlify.com/?p=hz6ZR) - If we set beat to **4** (all notes duration are 1/4) and offset to **5** we have obtained a 5/4 time signature. <br>
[Time in 7/8](https://nudrum.netlify.com/?p=E8R6i) - If we set beat to **8** (all notes duration are 1/8) and offset to **7** we have obtained a 7/8 time signature. 

**Tips** - *Minimum offset is 4*


## How to pattern?
Standing on the right margin of the screen we can found the pattern menu. Here we can **Save** our own pattern, setting a proper name or **Load** a previous one knowing its unique code. Unique code is recognizable in the brackets **[ ]**, it's followed by the timestamp and the title. 

Every pattern can be easily reached typing NuDrum url, followed by **?p=OurCodeHere** <br>
Example - https://nudrum.netlify.com/?p=63640

**Please**... **Please**... **Please**... Use the right name for your patterns to help everyone to understand and learn from your rhythmic structures. Keep in mind that NuDrum is an educational tool for everyone

![NuDrum logo](/img/pattern-menu.PNG) 

## How to upload?
The last row track is dedicated to create new instruments. We must choose a name for the instrument, then the sound from the **Sound Library**, the start beat and the offset. Once finished, click on the plus button and try our new sample.

![NuDrum logo](/img/newinst-menu.PNG) 

We can choose from many sounds or upload ours. Clicking on **Sound Library** will be popup the upload menu. On the left, we can choose the  category, then select the sample by clicking on or we can also upload a new one selecting our file and clicking on the icon.

![NuDrum logo](/img/upload-menu.PNG) 

### Write rules

Allow write files to the path:

    /Clap , /Crash , /HitHat , /Kick , /Ride , /Rim , /Snare , /Tom, /Loop
subject to the constraints:
    
    1. File is less than 5MB
    2. Content type is an audio
    3. Uploaded content type matches audio/.* content type
    4. File name is less than 32 characters
    
## Standalone
You can build your own standalone floating app thanks to [Electron](https://electronjs.org/)<br>
    
    git clone https://github.com/toboko/NuDrum
    npm install
    npm start

## Dependencies
[AngularJS](https://github.com/angular/angular.js) - AngularJS is a JavaScript-based open-source front-end web application framework <br>
[Pizzicato.js](https://github.com/alemangui/pizzicato) - Library to simplify the way you create and manipulate sounds with the Web Audio API <br>
[Toastr](https://github.com/CodeSeven/toastr) - Simple javascript toast notification <br>
[jQuery](https://github.com/jquery/jquery) - jQuery JavaScript Library 

## Copyright
NuDrum is hosted by [Netlify](https://netlify.com/) and work on [Google Firebase](https://firebase.google.com/) services

Copyright © 2018-2019 All the rights reserved to Nicola Bombaci

## Licence

NuDrum is under Academic Free License 3.0
[(AFL)](https://tldrlegal.com/license/academic-free-license-3.0-\(afl\))

