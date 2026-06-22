FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

ENV BACKEND_URL=http://backend:3001

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
