# PACC

PACC enables you to use your Chromecast as an output device in PulseAudio. This 
allows you to play music from your favorite player directly to your TV.

This is the Chrome app that runs in your browser. It initiates the connection to
the Chromecast and forwards the music stream information from the PulseAudio
PACC source.


## Setup

You need to create a virtual PulseAudio source-sink pair: 
```bash
pactl load-module module-virtual-source source_name=PACC uplink_sink=PACC
```

The above command has to be retyped every time you reboot your system.
The following line makes it permanent:
```bash
sudo sh -c 'echo "load-module module-virtual-source source_name=PACC uplink_sink=PACC" >> /etc/pulse/default.pa'
```

## How to use

Use ```pavucontrol``` to change the output device for a given application.
Choose the _PACC_ sink.

This app is hosted on <https://pa2cc.github.io/cast_sender/>. Simply point your
Chrome browser there, grant it access to the microphone (click on the icon left
of your address bar) and connect to your Chromecast. Enjoy.
