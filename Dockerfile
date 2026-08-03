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

RUN cat << 'EOF' > /etc/nginx/nginx.conf
worker_processes auto;
events { worker_connections 1024; }
http { 
    server_names_hash_bucket_size 128; 
    include mime.types; 
    default_type application/octet-stream; 
    sendfile on; 
    keepalive_timeout 65; 

    server { 
        listen 80; 
        server_name my-report-app.local; 
        client_max_body_size 100M; 

        location / { 
            root /usr/share/nginx/html; 
            index index.html index.htm; 
            try_files $uri $uri/ /index.html; 
        } 

        location ~* \.mjs$ { 
            root /usr/share/nginx/html; 
            default_type application/javascript; 
            add_header Content-Type "application/javascript; charset=utf-8" always; 
            try_files $uri =404; 
        } 

        location /api { 
            proxy_pass http://my-web-app-backend-1:8080; 
            proxy_set_header Host $host; 
            proxy_set_header X-Real-IP $remote_addr; 
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; 
            proxy_set_header X-Forwarded-Proto $scheme; 
            proxy_http_version 1.1; 
            proxy_set_header Connection ""; 
            proxy_buffering off; 
            proxy_request_buffering off; 
            proxy_cache off; 
            chunked_transfer_encoding on; 
            proxy_read_timeout 300s; 
            proxy_send_timeout 300s; 
            proxy_pass_header Content-Type; 
            proxy_pass_header Content-Disposition; 
        } 
    } 
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
