FROM alpine:3.20

ARG PB_VERSION=0.38.0
ARG TARGETARCH=amd64

WORKDIR /pb

RUN apk add --no-cache ca-certificates curl unzip \
  && case "$TARGETARCH" in \
       amd64) PB_ARCH=amd64 ;; \
       arm64) PB_ARCH=arm64 ;; \
       *) echo "unsupported arch: $TARGETARCH" && exit 1 ;; \
     esac \
  && curl -fL -o /tmp/pb.zip \
       "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
  && unzip /tmp/pb.zip -d /pb \
  && rm /tmp/pb.zip \
  && chmod +x /pb/pocketbase \
  && apk del curl unzip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
COPY scripts/entrypoint.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

EXPOSE 8090
VOLUME ["/pb/pb_data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health || exit 1

ENTRYPOINT ["/pb/entrypoint.sh"]
