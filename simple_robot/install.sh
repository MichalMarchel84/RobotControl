#!/bin/bash
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -;
sudo apt install nodejs;
sudo apt install npm;
npm i puppeteer-core;
npm i onoff;
chmod +x src/start.sh;
sudo apt install tightvncserver;
tightvncserver :1;
echo export USER="${USER}" >> src/user.sh;
sudo chmod +x src/user.sh;
crontab -l | { cat; echo "@reboot cd $(pwd)/src && bash start.sh > log.txt 2>&1"; } | crontab -;
