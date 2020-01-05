// Name: Rubi Arviv
// ID: 033906132
import { initialize } from '@muzilator/sdk';

var midi;

window.addEventListener('load', () => {
  async function init() {
    var platform = await initialize();
    midi = await platform.createChannel('midi');
    startListeners();
  }
  init();
  draw();
})

function onMidiMessage(message) {
  switch (message.data.type.toLowerCase()) {
    case 'note-on':
      startOsc(true,message.data.pitch,message.data.velocity);
    break;
    case 'note-off':
        startOsc(false,message.data.pitch,message.data.velocity);
    break;
    default:
      break;
  }
}

function startListeners() {
  midi.addEventListener('message', onMidiMessage);
  midi.start();
}


function frequencyFromNote(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function envGenOn(audioContext, vcaGain, a, d, s) {
  var now = audioContext.currentTime;
  a *= window.egMode;
  d *= window.egMode;
  vcaGain.cancelScheduledValues(0);
  vcaGain.setValueAtTime(0, now);
  vcaGain.linearRampToValueAtTime(1, now + a);
  vcaGain.linearRampToValueAtTime(s, now + a + d);
}

function envGenOff(audioContext, vcaGain, r) {
  var now = audioContext.currentTime;
  r *= window.egMode;
  vcaGain.cancelScheduledValues(0);
  vcaGain.setValueAtTime(vcaGain.value, now);
  vcaGain.linearRampToValueAtTime(0, now + r);
}

function SoundPlayer(audioContext, filterNode) {
  this.audioCtx = audioContext;
  this.gainNode = this.audioCtx.createGain();
  this.biquadFilter = this.audioCtx.createBiquadFilter();
  if(filterNode) {
    this.gainNode.connect(this.biquadFilter);
    this.biquadFilter.connect(filterNode);
    filterNode.connect(this.audioCtx.destination);
  } else {
    this.gainNode.connect(this.biquadFilter);
    this.biquadFilter.connect(this.audioCtx.destination);
  }
  
  this.oscillator = null;
}

SoundPlayer.prototype.setFrequency = function(val, when) {
  if(when) {
    this.oscillator.frequency.setValueAtTime(val, this.audioCtx.currentTime + when);
  } else {
    this.oscillator.frequency.setValueAtTime(val, this.audioCtx.currentTime);
  }
  return this;
};

SoundPlayer.prototype.setVolume = function(val, when) {
  if(when) {
    this.gainNode.gain.exponentialRampToValueAtTime(val, this.audioCtx.currentTime + when);
  } else {
    this.gainNode.gain.setValueAtTime(val, this.audioCtx.currentTime);
  }
  return this;
};

SoundPlayer.prototype.setWaveType = function(waveType) {
  this.oscillator.type = waveType;
  return this;
};

var last_note;
SoundPlayer.prototype.play = function(freq, vol, wave, when) {
  this.oscillator = this.audioCtx.createOscillator();
  this.oscillator.connect(this.gainNode);
  this.setFrequency(freq);
  if(wave) {
    this.setWaveType(wave);
  }
  this.setVolume(1/1000);

  this.oscillator.frequency.cancelScheduledValues(0);
  this.oscillator.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
  last_note = freq;
  envGenOn(this.audioCtx,this.gainNode.gain, window.a, window.d, window.s);

  if(when) {
    this.setVolume(1/1000, when - 0.02);
    this.oscillator.start(when - 0.02);
    this.setVolume(vol, when);
  } else {
    this.oscillator.start();
    this.setVolume(vol, 0.02);
  }
  return this;
};

SoundPlayer.prototype.stop = function(when) {
  if(this.oscillator==null)
    return;
  if(when) {
    this.gainNode.gain.setTargetAtTime(1/1000, this.audioCtx.currentTime + when - 0.05, 0.02);
    this.oscillator.stop(this.audioCtx.currentTime + when);
    this.biquadFilter.frequency.setValueAtTime(350, this.audioCtx.currentTime+when);
    this.biquadFilter.Q.setValueAtTime(1, this.audioCtx.currentTime+when);
  } else {
    this.gainNode.gain.setTargetAtTime(1/1000, this.audioCtx.currentTime, 0.02);
    this.oscillator.stop(this.audioCtx.currentTime + 0.05);
    this.biquadFilter.frequency.setValueAtTime(350, this.audioCtx.currentTime);
    this.biquadFilter.Q.setValueAtTime(1, this.audioCtx.currentTime);
  }
  this.oscillator.frequency.cancelScheduledValues(0);
  this.oscillator.frequency.setValueAtTime(last_note, this.audioCtx.currentTime);
  envGenOff(this.audioCtx,this.gainNode.gain, window.r);
  return this;
};

SoundPlayer.prototype.filter = function(freq,q) {
  this.biquadFilter.type = "highpass";
  this.biquadFilter.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
  //this.biquadFilter.Q.value = q;
  return this;
};




var acanvas,anlzCtx,fbc_array,bars,bar_x,bar_width,bar_height;

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audio = new AudioContext();
const analyser = audio.createAnalyser();
let myPlayer=new SoundPlayer(audio,analyser);

window.a = 0.1;
window.d = 0.1;
window.r = 0.1;
window.s = 1.0;
window.egMode = 5;
window.freq = 20;

var adsr;
var adsrCtx;
var width ;
var height;
var wRetio;
var hRetio;


function frameLooper(){
  requestAnimationFrame(frameLooper);
  fbc_array = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(fbc_array);
  anlzCtx.clearRect(0, 0, acanvas.width, acanvas.height); // Clear the canvas
  anlzCtx.fillStyle = '#00CCFF'; // Color of the bars
  bars = 100;
  for (var i = 0; i < bars; i++) {
    bar_x = i * 3;
    bar_width = 1;
    bar_height = -(fbc_array[i] / 2);
    anlzCtx.fillRect(bar_x, acanvas.height, bar_width, bar_height);
  }
}

window.helper = function updateEnvelope(a,d,s,r)
{
  adsrCtx.clearRect(0, 0, adsr.width, adsr.height); 
  adsrCtx.beginPath();
  let start_x=10;
  let start_y=10;
  let x, y;
  x = start_x;
  y = height+start_y;
  adsrCtx.moveTo(x, y);
  x = a * wRetio+start_x;
  y = start_y;
  adsrCtx.lineTo(x, y);
  x = a * wRetio+start_x;
  y = start_y;
  adsrCtx.lineTo(x, y);
  x += d * wRetio;
  y = height - s * hRetio+start_y;
  adsrCtx.lineTo(x, y);
  x += 1 * wRetio;
  adsrCtx.lineTo(x, y);
  x += r * wRetio;
  y = height+start_y;
  adsrCtx.lineTo(x, y);
  adsrCtx.stroke();
}


// function sendUserEvent(isOn,note,velocity) {
//     if(isOn)
//     {
//       startOsc(isOn, circle.id);
//       myPlayer.setWaveType("sine");
//       // myPlayer.filter(steps,q);
//     }
// }

function getWave()
{
  if(document.getElementById('sine').checked) { 
    return 'sine';
  } 
  else if(document.getElementById('square').checked) { 
    return 'square';
  } 
  else if(document.getElementById('sawtooth').checked) { 
    return 'sawtooth'; 
  } 
  else if(document.getElementById('triangle').checked) { 
    return 'triangle';
  } 
}

function startOsc(isOn,note,velocity) {
  if(isOn === undefined) isOn = true;

  if(isOn === true) {
      var wave = getWave();
      console.log(wave);
      myPlayer.play(frequencyFromNote(note), velocity/128, wave);
      last_note = frequencyFromNote(note);
  } else {
      myPlayer.stop(window.r*window.egMode);
  }
}

// function sendUserEvent(isOn,note,velocity) {
//   if(!isOn)
//   {
//     console.log(window.r*egMode);
//     synth.triggerAttackRelease (note,"+0",window.r*egMode);
//   }
//   else
//   {
//       console.log( window.a, window.d, window.s, window.r);
//       synth = new this.Tone.Synth({
//         "oscillator" : {
//           "type" : "sine"
//         },
//         "envelope" : {
//           "attack" : window.a*egMode,
//           "decay" : window.d*egMode,
//           "sustain" : window.s*egMode,
//           "release" : window.r*egMode,
//         }
//       }).toMaster();
//       document.querySelector("tone-fft").bind(synth);
//       synth.triggerAttackRelease (note);
//       //console.log(window.freq);  
//   }
// }

function draw() {
  analyser.fftSize = 1024;
  acanvas = document.getElementById("analyser");
  anlzCtx = acanvas.getContext('2d');
  frameLooper();
  adsr = document.getElementById("adsr");
  adsrCtx = adsr.getContext('2d');
  width = adsr.width-60;
  height = adsr.height-20;
  wRetio = width / 4;
  hRetio = height / 1;
  adsrCtx.strokeStyle = '#00CCFF';
  adsrCtx.lineWidth=5;
  window.helper(window.a,window.d,window.s,window.r);

  document.getElementById('test').onmousedown = function(e) { startOsc(true,64,100) };
  document.getElementById('test').onmouseup = function(e) { startOsc(false,64,100) };
}


