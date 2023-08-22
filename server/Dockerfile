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
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "80"]
