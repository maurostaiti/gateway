#!/bin/bash

MOZIOT_HOME="${MOZIOT_HOME:=${HOME}/.mozilla-iot}"

if [ ! -f .post_upgrade_complete ]; then
  ./tools/post-upgrade.sh
fi

run_app() {
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm

  sudo /sbin/ldconfig

  echo "nvm version"
  nvm --version
  echo "node version"
  node --version
  echo "npm version"
  npm --version
  echo "Starting gateway ..."
  npm start
}

mkdir -p "${MOZIOT_HOME}/log"
run_app > "${MOZIOT_HOME}/log/run-app.log" 2>&1
