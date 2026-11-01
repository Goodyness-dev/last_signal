FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci && npm run build
ENV HOST=0.0.0.0 PORT=3001
USER node
EXPOSE 3001
CMD ["npm","run","server"]
