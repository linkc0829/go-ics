# Multistaged build production golang service
FROM golang:1.15-alpine as base

FROM base AS ci

RUN apk update && apk upgrade && apk add --no-cache git && rm -rf /var/cache/apk/*
RUN mkdir /build
ADD . /build/
WORKDIR /build

# Build prod
FROM ci AS build-env

RUN go mod download

RUN apk add gcc g++
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o server ./cmd/icsharing/

FROM alpine AS prod
RUN apk --no-cache add ca-certificates

COPY --from=build-env build/server ./icsharing/
COPY . ./

CMD ["./icsharing/server"]