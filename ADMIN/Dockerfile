FROM node:16-alpine as base 

# WORKDIR  /src 

# COPY package*.json  ./

# RUN npm install -g nodemon && npm install

# EXPOSE 4102

# CMD [ "node", "start" ]

WORKDIR /usr/src

COPY package*.json  ./

RUN npm install

COPY . .

EXPOSE 8102

CMD [ "node", "start" ]
