# syntax=docker/dockerfile:1
# check=error=true

# Estúdio de Documentos: arquivos estáticos (sem build, sem back-end) servidos
# pelo nginx sem root na porta 8080.
#
#   docker build -t doc-studio .
#   docker run --rm -p 127.0.0.1:8080:8080 doc-studio   →  http://localhost:8080
#
# Imagem base: nginx oficial da F5/NGINX na variante sem privilégios (usuário
# 101, PID e temporários em /tmp), linha estável, Alpine "slim". Fixada pela
# tag e pelo digest para builds reproduzíveis; para atualizar, troque os dois
# (`docker buildx imagetools inspect nginxinc/nginx-unprivileged:<tag>`).
FROM nginxinc/nginx-unprivileged:1.30.5-alpine3.24-slim@sha256:3af0c10d960cc2502427fe1219c52989d309e7d65596869c60a34fd2fa2406f0

LABEL org.opencontainers.image.title="Estúdio de Documentos" \
      org.opencontainers.image.description="Editor de documentos na identidade visual do Governo do Ceará, com prévia A4 e PDF pelo navegador." \
      org.opencontainers.image.source="https://github.com/DanielFreitasDev/doc-studio"

COPY --link docker/nginx.conf /etc/nginx/conf.d/default.conf

# Pasta própria em vez de /usr/share/nginx/html: nada da página padrão do nginx
# fica publicado. Os arquivos pertencem ao root e o nginx (101) só os lê.
COPY --link index.html style.css script.js /srv/doc-studio/
COPY --link css /srv/doc-studio/css/
COPY --link js /srv/doc-studio/js/
COPY --link assets /srv/doc-studio/assets/

USER 101:101
EXPOSE 8080

# 127.0.0.1 e não localhost: o nginx escuta só IPv4 e localhost pode virar ::1.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=1s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/healthz"]
