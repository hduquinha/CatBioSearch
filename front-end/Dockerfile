FROM node:20

WORKDIR /app

COPY package*.json ./

RUN rm -rf node_modules package-lock.json && npm install

RUN npx vite --version

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
