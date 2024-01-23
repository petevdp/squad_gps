./pocketbase/pocketbase serve &
./caddy/caddy run &
cd ./server || exit
poetry run python main.py
cd ..
