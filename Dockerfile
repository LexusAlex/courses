# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
ENV ASTRO_TELEMETRY_DISABLED=1
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
COPY . .
EXPOSE 4321
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM dependencies AS build
ARG SITE_URL=https://lexusalex.ru
ARG SITE_BASE=/
ENV SITE_URL=$SITE_URL SITE_BASE=$SITE_BASE
COPY . .
RUN pnpm check && pnpm build && pnpm verify
# Put files at their real deployment subpath so Nginx can serve both modes.
RUN if [ "$SITE_BASE" != "/" ] && [ -n "$SITE_BASE" ]; then \
      mkdir -p "/www/${SITE_BASE#/}" && cp -a "dist/." "/www/${SITE_BASE#/}/"; \
    else mkdir -p /www && cp -a "dist/." /www/; fi

FROM nginx:stable-alpine AS production
ARG SITE_BASE=/
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /www/ /usr/share/nginx/html/
# Normalize and render the deployment path at build time, like Astro's base.
# Runtime only needs to read the generated configuration.
RUN chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx && \
    mkdir -p /tmp/nginx && chown nginx:nginx /tmp/nginx && \
    sed -i 's|^pid .*|pid /tmp/nginx/nginx.pid;|; /^user /d' /etc/nginx/nginx.conf && \
    SITE_BASE="$(printf '/%s/' "$SITE_BASE" | sed 's|//*|/|g')" && export SITE_BASE && \
    envsubst '${SITE_BASE}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/templates/default.conf.template
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
