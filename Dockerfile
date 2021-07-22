#STAGE: BUILD
FROM node:12.8.0-alpine AS build
WORKDIR /service
COPY . .
COPY ./nginx.conf ./nginx.conf
RUN ls
RUN npm install
RUN npm run build

#STAGE: SERVE
FROM nginx:stable AS deploy
COPY --from=build /service/build /service/explorer
WORKDIR /etc/nginx/conf.d/
RUN ls
COPY --from=build /service/nginx.conf /etc/nginx/conf.d/default.conf
RUN ls /etc/init.d
RUN nginx -c nginx.conf -t

EXPOSE 80