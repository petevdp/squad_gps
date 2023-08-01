FROM python:3.11.1
RUN mkdir /app
RUN mkdir /maps
RUN mkdir /downloads
COPY . /app

WORKDIR /app
ENV PYTHONPATH=${PYTHONPATH}:${PWD}

RUN pip3 install poetry
RUN poetry config virtualenvs.create false
RUN poetry install --no-dev

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "80"]
