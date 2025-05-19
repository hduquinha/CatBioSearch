FROM node:22

WORKDIR /app

COPY package*.json ./
COPY . .

RUN npm install

EXPOSE 4000

CMD ["node", "index.js"]
