# Python 3.14.7 Alpine, pinned to the locally verified upstream image.
ARG PYTHON_IMAGE=python:3-alpine@sha256:05b2b8b732ecd268fee8727a369f936f022d1321b59befd13c30ede22769dcdc
FROM ${PYTHON_IMAGE} AS dependencies
RUN apk add --no-cache build-base libffi-dev jpeg-dev zlib-dev
COPY pdf-creator/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r /tmp/requirements.txt

FROM ${PYTHON_IMAGE}
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 XDG_CACHE_HOME=/tmp/cache
RUN apk add --no-cache pango harfbuzz-subset font-liberation font-dejavu
COPY --from=dependencies /install /usr/local
WORKDIR /app
COPY pdf-creator/render.py pdf-creator/forms.py pdf-creator/server.py ./
COPY pdf-creator/templates ./templates
USER 65534:65534
EXPOSE 3020
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3020/health',timeout=2)"
CMD ["gunicorn", "--bind", "0.0.0.0:3020", "--workers", "2", "--timeout", "60", "--graceful-timeout", "15", "--max-requests", "200", "--max-requests-jitter", "20", "--worker-tmp-dir", "/tmp", "server:application"]
