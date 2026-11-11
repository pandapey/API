FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
# Non-root for prod hardening
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/server.js"]
