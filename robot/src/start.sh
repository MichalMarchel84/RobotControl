#!/bin/bash
source user.sh;
sudo vncserver :1;
export DISPLAY=:1.0;
sudo node core.js;