## build runner
FROM node:24-alpine AS build-runner

# Prisma's engines need openssl on Alpine
RUN apk add --no-cache openssl

# Set temp directory
WORKDIR /tmp/app

# Install dependencies from the lockfile
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Move source files and the Prisma schema
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src

# Generate the Prisma client and build project (yarn build runs prisma generate)
RUN yarn build

## production runner
FROM node:24-alpine AS prod-runner

# Prisma's engines need openssl on Alpine
RUN apk add --no-cache openssl

# Set work directory
WORKDIR /app

# Install production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile --ignore-scripts && yarn cache clean

# The schema and config let `prisma db push` run from this image (docker-compose does)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Move build files (the generated Prisma client is compiled into build/)
COPY --from=build-runner /tmp/app/build /app/build

# Run as the unprivileged node user, not root
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
CMD [ "node", "build/main.js" ]
