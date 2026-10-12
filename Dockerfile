# ============================================================
# Website Discovery - Production Dockerfile
# ============================================================


# ------------------------------------------------------------
# 1. Build React/Vite Admin
# ------------------------------------------------------------

FROM node:20-alpine AS admin-build

WORKDIR /app/admin

COPY admin/package*.json ./

# package-lock.json currently does not exist
RUN npm install

COPY admin/ ./

ARG VITE_BASE_PATH=/websitediscovery
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

RUN npm run build


# ------------------------------------------------------------
# 2. Build Express / TypeScript Backend
# ------------------------------------------------------------

FROM node:20-alpine AS backend-build

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install

COPY backend/ ./

RUN npm run build


# ------------------------------------------------------------
# 3. Production Runtime
# ------------------------------------------------------------

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=4000
ENV BASE_PATH=/websitediscovery

WORKDIR /app/backend


# ------------------------------------------------------------
# Install production dependencies
# ------------------------------------------------------------

COPY backend/package*.json ./

RUN npm install --omit=dev


# ------------------------------------------------------------
# Copy compiled backend
# ------------------------------------------------------------

COPY --from=backend-build /app/backend/dist ./dist


# ------------------------------------------------------------
# Database files
# ------------------------------------------------------------

COPY backend/migrations ./migrations
COPY backend/seeds ./seeds
COPY backend/knexfile.js ./knexfile.js


# ------------------------------------------------------------
# Public frontend
# ------------------------------------------------------------

COPY backend/public-frontend ./public-frontend


# ------------------------------------------------------------
# React/Vite Admin build
# ------------------------------------------------------------

COPY --from=admin-build /app/admin/dist /app/admin/dist


# ------------------------------------------------------------
# Docker entrypoint
# ------------------------------------------------------------

COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh


# ------------------------------------------------------------
# Express port
# ------------------------------------------------------------

EXPOSE 4000


# ------------------------------------------------------------
# Start application
# ------------------------------------------------------------

ENTRYPOINT ["./docker-entrypoint.sh"]