FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite inlines VITE_* variables at build time, so the API URL must be a build argument.
ARG VITE_API_BASE_URL=/api
ARG VITE_APP_VERSION=dev
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_APP_VERSION=$VITE_APP_VERSION
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
