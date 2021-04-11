# forgeLoad
A Node.js script for downloading images from mse-modern and generating basic card skeletons.

### How to use
Run `node forgeLoad` from the console to run the base program. It will run through the entire msem/cards.json database and print the skeletons, edition files, and card images.

### Arguments
Adding arguments to the command line changes the behavior. These can be in any order or combination

> -rev

Runs Revolution instead of MSEM.

> -dfc

Only runs DFCs.

> -f

Only generates card skeleton files (others only generated when paired with -i or -e)

> -i

Only downloads card images (others only generated when paired with -f or -e)

> -e

Only generate edition files (others only generated when paired with -f or -i)

> SET or -SET

Only download cards from the given set. There can be multiple of these

> -r ###

Restart the download from card ###, used when errors/lag cause the program to terminate early, in which case it will tell you which number to use here.

So for example using `node forgeLoad -e -rev` will generate the edition files for Revolution.

Card images are saved within set folders in the 'images' folder, editions files get saved in the 'editions' folder, card skeletons are saved in set folders in the 'skeletons' folder, or to the 'completed' folder if they are vanilla/french vanilla creatures, which LackeyBot is able to code on its own.
