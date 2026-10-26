# DZ Store web (Next.js). In docker-compose the code is mounted and "npm run dev" runs;
# for production, build with: docker build -t dz-store-web . && docker run -p 3000:3000 -e API_URL=... dz-store-web
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = production ]; then npm run build && npm run start; else npm run dev; fi"]
