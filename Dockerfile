FROM node:20-bookworm-slim AS build

WORKDIR /workspace/application

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

COPY application/package.json application/pnpm-lock.yaml application/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY application/ ./
RUN pnpm prisma generate && pnpm build

FROM node:20-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY data-pipeline/requirements.txt ./data-pipeline/requirements.txt
RUN python3 -m venv /opt/admission-compass-python \
  && /opt/admission-compass-python/bin/pip install --no-cache-dir -r data-pipeline/requirements.txt

COPY data-pipeline/ ./data-pipeline/
COPY --from=build --chown=node:node /workspace/application ./application/

RUN mkdir -p /data/admin-imports \
  && chown -R node:node /data/admin-imports

ENV NODE_ENV=production \
  PORT=3000 \
  HOSTNAME=0.0.0.0 \
  PYTHON_EXECUTABLE=/opt/admission-compass-python/bin/python \
  ADMIN_IMPORTS_ROOT=/data/admin-imports

USER node
WORKDIR /workspace/application

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "node_modules/next/dist/bin/next", "start"]
