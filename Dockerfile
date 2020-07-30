FROM node:12-slim AS builder

WORKDIR /app

RUN apt-get update && apt install -y \
    g++ make git python \
    && yarn global add node-gyp \
    && rm -rf /var/lib/apt/lists/* 

ADD package.json package-lock.json yarn.lock /app/
RUN npm install

ADD . /app
RUN npm run build

# Step 2: runtime
FROM node:12-slim

EXPOSE 3000

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

WORKDIR /app

COPY --from=builder /app .

CMD ["npm", "run", "serve"]
