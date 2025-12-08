# Build Stage
FROM node:18-alpine as build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# Accept build arguments for environment variables
ARG REACT_APP_API_URL
ARG REACT_APP_AI_SERVICE_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AI_SERVICE_URL=$REACT_APP_AI_SERVICE_URL
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Custom Nginx config
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
