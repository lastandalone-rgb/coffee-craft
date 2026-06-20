FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
# Install build dependencies for sqlite3 just in case, and then run npm install
RUN apk add --no-cache python3 make g++ && \
    npm install && \
    apk del python3 make g++

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
