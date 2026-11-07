FROM node:20-trixie-slim

# Firestore Emulator requires a JDK. Keeping it in the image removes the
# host-side Java/Firebase CLI requirement from `make up`.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-21-jre-headless ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global firebase-tools@15.34.2

WORKDIR /workspace
