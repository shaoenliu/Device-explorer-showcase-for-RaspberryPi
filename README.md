# Device-explorer-showcase-for-RaspberryPi
Because I am using the Epiphany browser in raspberrypi, so just go to the page 

https://github.com/elalemanyo/raspberry-pi-kiosk-screenand find the Epiphany browser part and follow the orders. And 

there are some part that need to be changed.

For the code of
```
sudo -u pi epiphany-browser -a -i --profile ~/.config [URL] --display=:0 &
```

just change the [URL] part into the address of the .html file
and for
````
sleep 15s;
xte "key F11" -x:0
````

It is more like a keyboard simulator. Press F11 button after 15s, and we can change the time a little smaller, so that we dont need to wait for 

too long to get the fullscreen. But however it cant be too short as well, because if it execute the F11 before the browser opens, it will fail

to lunch fullscreen. So for my case, I set it to 4.5s.

If you want to change back to normal model, just 
```
nano ~/.config/lxsession/LXDE-pi/autostart
```
and comment lines that has been changed and recover the original lines.
