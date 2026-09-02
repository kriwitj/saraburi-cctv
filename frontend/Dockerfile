FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ตัวแปร VITE_* ต้องถูกกำหนด "ตอน build" เท่านั้น (Vite ฝังค่าลงใน bundle)
# จึงต้องส่งผ่าน --build-arg / docker-compose build.args ไม่ใช่ environment ตอน run
ARG VITE_API_URL
ARG VITE_MEDIA_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_MEDIA_URL=${VITE_MEDIA_URL}

# สั่ง build หน้าตาเว็บ React 19 + Vite
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
