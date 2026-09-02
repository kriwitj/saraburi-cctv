FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# สั่ง build หน้าตาเว็บ React 19 + Vite
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
