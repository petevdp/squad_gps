FROM node:19
RUN npm i -g pnpm
RUN mkdir /client
COPY ./gui/package.json ./gui/pnpm-lock.yaml /client/
WORKDIR /client
RUN pnpm install
COPY ./gui /client
RUN pnpm run build

FROM python:3.11.1
RUN mkdir /server

RUN pip3 install poetry
RUN poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock /server/
WORKDIR /server
ENV PYTHONPATH=${PYTHONPATH}:${PWD}
RUN poetry install --no-dev
COPY . .

WORKDIR /

COPY Caddyfile /Caddyfile
COPY pocketbase /pocketbase
COPY caddy /caddy

CMD ["./caddy", "run", "--config", "/Caddyfile"]
CMD ["python3", "-m", "pocketbase"]
