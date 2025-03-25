FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p data && chmod -R 777 data

EXPOSE 3000

CMD ["npm", "start"] 