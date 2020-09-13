# forgeLoad
A Node.js script for downloading images from mse-modern and generating basic card skeletons.

### How to use
Run `node forgeLoad` from the console to run the base program. It will run through the entire msem/cards.json database and print the skeletons and card images.

### Arguments
Adding arguments to the command line changes the behavior. These can be in any order or combination

> -dfc

Only runs DFCs.

> -f

Only generates card skeleton files

> -i

Only downloads card images

> SET or -SET

Only download cards from the given set. There can be multiple of these

> -r ###

Restart the download from card ###, used when errors/lag cause the program to terminate early, in which case it will tell you which number to use here.

So for example using `node forgeLoad -f KOD LVS STN` will generate all the card skeleton files for KOD, LVS, and STN.

Card images are saved within set folders in the 'images' folder, card skeletons are saved in set folders in the 'skeletons' folder, or to the 'completed' folder if they are vanilla/french vanilla creatures, which LackeyBot is able to code on its own.
