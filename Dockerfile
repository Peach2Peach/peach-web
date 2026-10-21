# syntax=docker/dockerfile:1.6

# ─── Build stage ────────────────────────────────────────────────────────────
FROM node:24.22.1-alpine AS build

# Both env vars are inlined into the bundle by Vite at build time, so they
# must be passed as --build-arg (not -e) when building the image. Build one
# image per (api-url, chain) pair.
ARG VITE_API_URL
ARG VITE_BITCOIN_NETWORK=BITCOIN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BITCOIN_NETWORK=$VITE_BITCOIN_NETWORK

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Serve stage ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
