#!/usr/bin/env bash
set -euo pipefail
cd /srv/book-activity/runner
[[ -x ./config.sh ]] || { echo 'Prepare the official runner binaries first.' >&2; exit 1; }
[[ ! -f .runner ]] || { echo 'A runner is already registered here; inspect it before changing registration.' >&2; exit 1; }
read -r -s -p 'Book-Activity one-time runner registration token: ' registration_token
printf '\n'
./config.sh --url https://github.com/technologies-inspirer/Book-Activity \
  --token "$registration_token" --unattended --name book-activity-office \
  --labels office-production --work _work
unset registration_token
sudo ./svc.sh install deploy
service_name="$(cat .service)"
[[ "$service_name" =~ ^[A-Za-z0-9_.@-]+\.service$ ]] || { echo 'Unexpected runner service name.' >&2; exit 1; }
sudo install -d -m 755 "/etc/systemd/system/$service_name.d"
# Keep Book Activity registry credentials separate from the existing ATS login.
printf '[Service]\nEnvironment=DOCKER_CONFIG=/srv/book-activity/docker-auth\n' \
  | sudo tee "/etc/systemd/system/$service_name.d/book-activity.conf" > /dev/null
sudo systemctl daemon-reload
sudo ./svc.sh start
