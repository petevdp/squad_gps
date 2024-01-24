./pocketbase/pocketbase serve &
./caddy/caddy run &
cd ./route_processor || exit
poetry run python main.py
cd ..
