# --- build stage ----------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Workspace manifests (allows npm to resolve workspace graph)
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/pocketbase/package.json ./apps/pocketbase/

RUN npm ci --include-workspace-root --workspace=apps/web

# Source
COPY apps/web ./apps/web

# Bake the PocketBase URL into the bundle. Pass --build-arg VITE_POCKETBASE_URL=...
# (or set under "build args" in Coolify).
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}

RUN npm run build --workspace=apps/web

# --- runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist/apps/web /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
