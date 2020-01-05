 // Name: Rubi Arviv
// ID: 033906132 


Description: This is a synth that his wave and envelope can be configured.

ID: synth-envelope

input messages:
1. note-on - received when a note is played
channel name  'midi' 
message parameters:  'note-on', pitch int[0...127], velocity int[0...127]

1. note-off - received when a note is played
channel name  'midi' 
message parameters:  'note-off', pitch int[0...127], velocity int[0...127]

