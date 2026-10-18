# build stage
# build image set
FROM node:22-alpine AS build
# install pnpm and the version to use is 10.33.2
RUN npm install -g pnpm@10.33.2
# tell the working directory we are using repo for this(just a folder in the build stage where all things will happen)
WORKDIR /repo
# copy initial files to install dependencies for caching
COPY pnpm-lock.yaml pnpm-workspace.yaml /repo/
#this one i dont know what it is for. was written in notes so i just wrote it.
RUN pnpm fetch
#  copy everything
COPY . .
#install with filter
RUN pnpm install --offline --frozen-lockfile --filter @cadence/server
#build
RUN pnpm --filter @cadence/server build
# output the out folder i guess
RUN pnpm --filter @cadence/server deploy --prod --legacy /out

# runtime stage
# runtime image
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules/ ./node_modules/ 
COPY --from=build /repo/apps/server/dist ./dist/


USER node
EXPOSE 4000
CMD [ "node","--enable-source-maps","dist/server.js" ]