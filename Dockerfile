# 1단계: 리액트 빌드
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2단계: Nginx를 이용한 웹 서버 실행
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# 3단계: VSCode 내 Nginx 설정파일 도커 내 Nginx 파일 복사.
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
