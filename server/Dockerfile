FROM python:3.11.1
RUN mkdir /app

RUN pip3 install poetry
RUN poetry config virtualenvs.create false

COPY . /app
WORKDIR /app
ENV PYTHONPATH=${PYTHONPATH}:${PWD}

RUN poetry install --no-dev

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "80"]
