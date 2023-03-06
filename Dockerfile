FROM node:19-alpine3.17

LABEL maintainer="Michelle Pellon"

RUN addgroup -S chili \
    && adduser -S -G chili chili

WORKDIR /home/chili

COPY . ./
RUN chown -R chili:chili ./

USER chili

RUN npm install

EXPOSE 8080

CMD npm start