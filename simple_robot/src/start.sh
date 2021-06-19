#!/bin/bash
source user.sh;
vncserver :1;
export DISPLAY=:1.0;
node core.js;